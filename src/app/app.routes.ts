import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home-page/home-page').then(m => m.HomePage)
  },
  {
    path: 'room/:id',
    loadComponent: () => import('./component/scrum-poker/scrum-poker').then(m => m.ScrumPoker)
  },
  {
    path: '**',
    redirectTo: ''
  }

];
