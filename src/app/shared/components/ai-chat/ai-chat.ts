import { Component, ElementRef, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-ai-chat',
  template: `
    <dialog #chat aria-labelledby="ai-chat-title" (cancel)="close()" (close)="opened.set(false)">
      <header>
        <h2 id="ai-chat-title" i18n="@@aiChat.title">Chat IA</h2>
        <button
          type="button"
          aria-label="Fechar chat"
          i18n-aria-label="@@aiChat.close"
          (click)="close()"
          autofocus
        >
          ×
        </button>
      </header>
      <div class="messages">
        <p i18n="@@aiChat.message">Estou trabalhando nisso</p>
      </div>
    </dialog>
    <button
      #launcher
      class="launcher"
      type="button"
      aria-label="Abrir chat de inteligência artificial"
      i18n-aria-label="@@aiChat.open"
      aria-haspopup="dialog"
      [attr.aria-expanded]="opened()"
      (click)="open()"
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M10 4H6a3 3 0 0 0-3 3v10l4-3h10a3 3 0 0 0 3-3v-1" />
        <path d="m17 2 1.4 3.6L22 7l-3.6 1.4L17 12l-1.4-3.6L12 7l3.6-1.4L17 2Z" />
        <path d="M7 10h2m-2-3h1" />
      </svg>
    </button>
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
