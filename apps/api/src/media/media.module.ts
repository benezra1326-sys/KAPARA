import { Body, Controller, Get, HttpCode, HttpException, Module, NotFoundException, Param, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import { requestBase, type HttpRequest, type HttpResponse } from './http';
import { PhotoUploadRequest, type PhotoUploadTicket } from '@kapara/shared';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { RateLimiter } from '../auth/rate-limit';
import { ZodPipe } from '../common/zod.pipe';
import { LocalUploadError, PhotoStorage } from './storage';
import { SignedPhotoUrls } from './signed-urls';
import { APP_INTERCEPTOR } from '@nestjs/core';


/** 30 upload tickets per member per 10 minutes: plenty for 6 photos and retries. */
const tickets = new RateLimiter(30, 10 * 60_000);

@Controller('media')
class MediaController {
  constructor(private readonly storage: PhotoStorage) {}

  /** Step 1 of a photo upload: where to send the file. Step 3 is PUT /profiles/me/photos. */
  @Post('photo-uploads')
  @UseGuards(AuthGuard)
  @HttpCode(201)
  ticket(@CurrentUser() me: AuthUser, @Body(new ZodPipe(PhotoUploadRequest)) b: PhotoUploadRequest, @Req() req: HttpRequest): PhotoUploadTicket {
    tickets.hit(me.id);
    return this.storage.createUpload(me.id, b.contentType, requestBase(req));
  }

  /** Local storage (development only): the signed ticket in the path authorises one file. */
  @Put('local/:token')
  @HttpCode(200)
  async localUpload(@Param('token') token: string, @Req() req: HttpRequest) {
    try {
      await this.storage.writeLocal(token, req.headers['content-type'], req);
      return { ok: true };
    } catch (err) {
      if (err instanceof LocalUploadError) throw new HttpException({ code: err.code }, err.status);
      throw err;
    }
  }

  @Get('local/:userId/:file')
  localFile(@Param('userId') userId: string, @Param('file') file: string, @Res() res: HttpResponse) {
    const f = this.storage.localFile(userId, file);
    if (!f) throw new NotFoundException();
    res.setHeader('cache-control', 'private, max-age=86400');
    res.setHeader('x-content-type-options', 'nosniff');
    res.type(f.type).sendFile(f.path, (err) => { if (err && !res.headersSent) res.status(404).end(); });
  }
}

@Module({ controllers: [MediaController], providers: [PhotoStorage, { provide: APP_INTERCEPTOR, useClass: SignedPhotoUrls }], exports: [PhotoStorage] })
export class MediaModule {}
