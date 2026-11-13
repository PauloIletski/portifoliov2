import { Component, ElementRef, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-ai-chat',
  template: `
    <dialog #chat aria-labelledby="ai-chat-title" (cancel)="close()" (close)="opened.set(false)">
      <header>
        <h2 id="ai-chat-title">Chat IA</h2>
        <button type="button" aria-label="Fechar chat" (click)="close()" autofocus>×</button>
      </header>
      <div class="messages">
        <p>Estou trabalhando nisso</p>
      </div>
    </dialog>
    <button
      #launcher
      class="launcher"
      type="button"
      aria-label="Abrir chat de inteligência artificial"
      aria-haspopup="dialog"
      [attr.aria-expanded]="opened()"
      (click)="open()"
    >IA</button>
  `,
  styleUrl: './ai-chat.sass',
})
export class AiChat {
  protected readonly opened = signal(false);
  private readonly chat = viewChild.required<ElementRef<HTMLDialogElement>>('chat');
  private readonly launcher = viewChild.required<ElementRef<HTMLButtonElement>>('launcher');

  protected open(): void {
    this.chat().nativeElement.showModal();
    this.opened.set(true);
  }

  protected close(): void {
    this.chat().nativeElement.close();
    this.opened.set(false);
    this.launcher().nativeElement.focus();
  }
}
