import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CsrfGuard } from './csrf.guard';
import { LoginProtectionService } from './login-protection.service';
import { PasswordHashService } from './password-hash.service';
import { ReauthenticationController } from './reauthentication.controller';
import { ReauthenticationGuard } from './reauthentication.guard';
import { ReauthenticationService } from './reauthentication.service';
import { SessionAuthGuard } from './session-auth.guard';
import { SessionService } from './session.service';
import { SingleOperatorService } from './single-operator.service';

@Module({
  controllers: [AuthController, ReauthenticationController],
  providers: [
    AuthService,
    CsrfGuard,
    LoginProtectionService,
    PasswordHashService,
    ReauthenticationGuard,
    ReauthenticationService,
    SessionAuthGuard,
    SessionService,
    SingleOperatorService,
  ],
  exports: [
    AuthService,
    CsrfGuard,
    LoginProtectionService,
    PasswordHashService,
    ReauthenticationGuard,
    ReauthenticationService,
    SessionAuthGuard,
    SessionService,
    SingleOperatorService,
  ],
})
export class AuthModule {}
