import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { routes } from './app.routes';
const firebaseConfig = {
  apiKey: "AIzaSyB3AmPfFVf9MCysgMi0FmFyWC0uceqAxjI",
  authDomain: "agile-poker-online.firebaseapp.com",
  databaseURL: "https://agile-poker-online-default-rtdb.firebaseio.com",
  projectId: "agile-poker-online",
  storageBucket: "agile-poker-online.firebasestorage.app",
  messagingSenderId: "63836452776",
  appId: "1:63836452776:web:7a501c89f64ad96bb20f9d"
};
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideDatabase(() => getDatabase())
  ]
};
