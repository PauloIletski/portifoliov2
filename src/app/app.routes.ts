import { adminGuard } from './core/data/auth';
import { Routes } from '@angular/router';

const portfolioTitle = $localize`:@@app.title:PV. | Paulo Vieira | Engenheiro de Software`;

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import(`./features/home/home`).then((m) => m.Home),
    title: portfolioTitle,
  },
  {
    path: 'projects',
    title: portfolioTitle,
    loadComponent: () => import(`./features/projects/projects`).then((m) => m.Projects),
  },
  {
    path: 'experience',
    title: portfolioTitle,
    loadComponent: () => import(`./features/experience/experience`).then((m) => m.Experience),
  },
  {
    path: 'about',
    title: portfolioTitle,
    loadComponent: () => import(`./features/about/about`).then((m) => m.About),
  },
  {
    path: 'contact',
    title: portfolioTitle,
    loadComponent: () => import(`./features/contact/contact`).then((m) => m.Contact),
  },
  { path: 'admin/login', title: portfolioTitle, loadComponent: () => import('./features/admin/login').then(m => m.Login) },
  { path: 'admin/forgot-password', title: portfolioTitle, loadComponent: () => import('./features/admin/password-recovery').then(m => m.PasswordRecovery) },
  { path: 'admin/reset-password', title: portfolioTitle, data: { reset: true }, loadComponent: () => import('./features/admin/password-recovery').then(m => m.PasswordRecovery) },
  { path: 'admin', title: portfolioTitle, canActivate: [adminGuard], loadComponent: () => import('./features/admin/admin').then(m => m.Admin) },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
