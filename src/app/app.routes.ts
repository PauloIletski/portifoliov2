import { adminGuard } from './core/data/auth';
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import(`./features/home/home`).then((m) => m.Home),
    title: $localize`:@@app.title:Paulo Vieira | Engenheiro de Software`,
  },
  {
    path: 'projects',
    loadComponent: () => import(`./features/projects/projects`).then((m) => m.Projects),
  },
  {
    path: 'experience',
    loadComponent: () => import(`./features/experience/experience`).then((m) => m.Experience),
  },
  {
    path: 'about',
    loadComponent: () => import(`./features/about/about`).then((m) => m.About),
  },
  {
    path: 'contact',
    loadComponent: () => import(`./features/contact/contact`).then((m) => m.Contact),
  },
  { path: 'admin/login', loadComponent: () => import('./features/admin/login').then(m => m.Login) },
  { path: 'admin/forgot-password', loadComponent: () => import('./features/admin/password-recovery').then(m => m.PasswordRecovery) },
  { path: 'admin/reset-password', data: { reset: true }, loadComponent: () => import('./features/admin/password-recovery').then(m => m.PasswordRecovery) },
  { path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./features/admin/admin').then(m => m.Admin) },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
