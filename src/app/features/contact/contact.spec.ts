import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { Content } from '../../core/supabase/content';
import { Contact } from './contact';
import { contactHref, decodeChannels } from './contact-channel';
import { ContactFields } from '../admin/contact-fields';

describe('Contact channels', () => {
  const list = vi.fn();
  beforeEach(() => {
    list.mockReset();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    TestBed.configureTestingModule({ providers: [{ provide: Content, useValue: { list } }] });
  });
  afterEach(() => vi.unstubAllGlobals());
  it('generates wa.me from an international phone number', () => {
    expect(contactHref({ type: 'whatsapp', value: '+55 (11) 99999-9999', visible: true })).toBe(
      'https://wa.me/5511999999999',
    );
    expect(contactHref({ type: 'whatsapp', value: 'abc5511', visible: true })).toBeUndefined();
    expect(contactHref({ type: 'whatsapp', value: '00000000000', visible: true })).toBeUndefined();
  });
  it('rejects unsafe URLs and visible channels without a destination', () => {
    expect(
      decodeChannels('[{"type":"linkedin","value":"javascript:alert(1)","visible":true}]'),
    ).toBeUndefined();
    expect(decodeChannels('[{"type":"whatsapp","value":"","visible":true}]')).toBeUndefined();
    expect(decodeChannels('[{"type":"whatsapp","value":"","visible":false}]')).toHaveLength(1);
  });
  it('renders WhatsApp and LinkedIn with their icons and hides disabled channels', async () => {
    list.mockResolvedValue([
      {
        name: 'Contato',
        channels: [
          { type: 'whatsapp', value: '+55 (11) 99999-9999', visible: true },
          { type: 'linkedin', value: 'https://www.linkedin.com/in/example', visible: true },
          { type: 'email', value: 'hidden@example.com', visible: false },
        ],
      },
    ]);
    const fixture = TestBed.createComponent(Contact);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.contact-link')).toHaveLength(2);
    expect(root.querySelector('.whatsapp')?.getAttribute('href')).toBe(
      'https://wa.me/5511999999999',
    );
    expect(root.querySelectorAll('app-contact-icon')).toHaveLength(2);
    expect(root.textContent).toContain('LinkedIn');
    expect(root.textContent).not.toContain('hidden@example.com');
  });
  it('respects all toggles off without restoring mock links', async () => {
    list.mockResolvedValue([
      {
        name: 'Contato',
        channels: [{ type: 'linkedin', value: 'https://linkedin.com', visible: false }],
      },
    ]);
    const fixture = TestBed.createComponent(Contact);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.contact-link')).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('Nenhum canal');
  });
  it('shows an empty state without example contacts when the backend is empty', async () => {
    list.mockResolvedValue([]);
    const fixture = TestBed.createComponent(Contact);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Dados de contato de exemplo');
    expect(fixture.nativeElement.textContent).toContain('Nenhum canal');
    expect(fixture.nativeElement.querySelectorAll('.contact-link')).toHaveLength(0);
  });
  it('synchronizes the visibility toggle and address across both languages', async () => {
    const channels = JSON.stringify([
      { type: 'linkedin', value: 'https://linkedin.com/in/example', visible: true },
    ]);
    const control = new FormControl(channels, { nonNullable: true }),
      translation = new FormControl(channels, { nonNullable: true });
    const fixture = TestBed.createComponent(ContactFields);
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('translation', translation);
    await fixture.whenStable();
    (fixture.nativeElement.querySelector('button[role="switch"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(JSON.parse(control.value)[0].visible).toBe(false);
    expect(translation.value).toBe(control.value);
    (fixture.nativeElement.querySelector('input') as HTMLInputElement).value =
      'https://linkedin.com/in/updated';
    fixture.nativeElement
      .querySelector('input')
      .dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(JSON.parse(translation.value)[0].value).toContain('updated');
  });
  it('lists contacts from multiple independent database records', async () => {
    list.mockResolvedValue([
      { name: 'E-mail', channels: [{ type: 'email', value: 'one@example.com', visible: true }] },
      {
        name: 'LinkedIn',
        channels: [{ type: 'linkedin', value: 'https://linkedin.com/in/two', visible: true }],
      },
    ]);
    const fixture = TestBed.createComponent(Contact);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.contact-link')).toHaveLength(2);
  });
});
