import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { lockBrowserConsole } from './app/core/security/console-lock';

if (!isDevMode()) {
  lockBrowserConsole();
}

bootstrapApplication(App, appConfig).catch((err) => {
  if (isDevMode()) {
    console.error(err);
  }
});
