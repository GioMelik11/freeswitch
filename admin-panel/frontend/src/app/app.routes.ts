import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { ShellComponent } from './layout/shell.component';
import { LoginPage } from './pages/login.page';
import { FilesPage } from './pages/files.page';
import { ExtensionsPage } from './pages/extensions.page';
import { TrunksPage } from './pages/trunks.page';
import { QueuesPage } from './pages/queues.page';
import { IvrsPage } from './pages/ivrs.page';
import { TimeConditionsPage } from './pages/time-conditions.page';
import { SoundsPage } from './pages/sounds.page';
import { SipAiPage } from './pages/sip-ai.page';
import { ConsolePage } from './pages/console.page';
import { NatPage } from './pages/nat.page';
import { AdvancedSettingsPage } from './pages/advanced-settings.page';
import { SipSettingsPage } from './pages/sip-settings.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginPage },
  {
    path: 'app',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'pbx/extensions' },
      { path: 'pbx/extensions', component: ExtensionsPage },
      { path: 'pbx/queues', component: QueuesPage },
      { path: 'pbx/ivrs', component: IvrsPage },
      { path: 'pbx/time-conditions', component: TimeConditionsPage },
      { path: 'pbx/trunks', component: TrunksPage },
      { path: 'console', component: ConsolePage },
      { path: 'ai', component: SipAiPage },
      { path: 'nat', component: NatPage },
      { path: 'settings/advanced', component: AdvancedSettingsPage },
      { path: 'settings/sip', component: SipSettingsPage },
      { path: 'sounds', component: SoundsPage },
      { path: 'files', component: FilesPage },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
