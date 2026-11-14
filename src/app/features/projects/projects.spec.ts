import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROJECTS, Project } from './project';
import { Projects } from './projects';
import { BreakpointObserver } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';
import { Content } from '../../core/data/content';

const SECOND: Project = {
  ...PROJECTS[0],
  id: 'test',
  name: 'Projeto de teste',
  author: 'Outro autor',
  mark: 'T',
  summary: 'Resumo de teste',
  technologies: ['Outra tecnologia'],
  collectionStack: 'Outra tecnologia',
  demoRoute: '/test-demo',
  demoLabel: 'Abrir teste',
  detailsTitle: 'Detalhes de teste',
  details: [{ title: 'Decisão de teste', description: 'Descrição de teste' }],
};

describe('Responsive project selection', () => {
  let viewport: BehaviorSubject<{ matches: boolean; breakpoints: Record<string, boolean> }>;
  beforeEach(() => {
    viewport = new BehaviorSubject<{ matches: boolean; breakpoints: Record<string, boolean> }>({
      matches: true,
      breakpoints: {},
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Content, useValue: { list: async () => [] } },
        { provide: BreakpointObserver, useValue: { observe: () => viewport } },
      ],
    });
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('loads all selected data without moving focus or changing the collection structure', async () => {
    const fixture = TestBed.createComponent(Projects);
    fixture.componentRef.setInput('projects', [PROJECTS[0], SECOND]);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const item = root.querySelectorAll<HTMLButtonElement>('.project-listing')[1];
    item.focus();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    item.dispatchEvent(event);
    await fixture.whenStable();
    expect(event.defaultPrevented).toBe(true);
    expect(root.querySelector('#featured-title')?.textContent).toBe(SECOND.name);
    expect(root.querySelector('.project-summary')?.textContent).toBe(SECOND.summary);
    expect(root.querySelector('.technology-list')?.textContent).toContain(SECOND.technologies[0]);
    expect(root.querySelector('.project-actions a')?.getAttribute('href')).toBe(SECOND.demoRoute);
    expect(root.querySelector('#details-title')?.textContent).toBe(SECOND.detailsTitle);
    expect(root.querySelector('.details-grid')?.textContent).toContain(
      SECOND.details[0].description,
    );
    expect(item.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(item);
    expect(item.querySelector('.listing-name')).not.toBeNull();
    expect(item.querySelector('.listing-category')).not.toBeNull();
  });

  it('keeps one inline detail on mobile and preserves selection when refreshed', async () => {
    const fixture = TestBed.createComponent(Projects);
    fixture.componentRef.setInput('projects', [PROJECTS[0], SECOND]);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelectorAll<HTMLButtonElement>('.project-listing')[1].click();
    await fixture.whenStable();
    viewport.next({ matches: false, breakpoints: {} });
    await fixture.whenStable();
    expect(root.querySelectorAll('#project-panel')).toHaveLength(1);
    expect(
      root.querySelectorAll('.collection-grid > li')[1].querySelector('#project-panel'),
    ).not.toBeNull();
    expect(root.querySelector('#featured-title')?.textContent).toBe(SECOND.name);
    fixture.componentRef.setInput('projects', [PROJECTS[0], { ...SECOND, summary: 'Atualizado' }]);
    await fixture.whenStable();
    expect(root.querySelector('.project-summary')?.textContent).toBe('Atualizado');
    fixture.componentRef.setInput('projects', [PROJECTS[0]]);
    await fixture.whenStable();
    expect(root.querySelector('#featured-title')?.textContent).toBe(PROJECTS[0].name);
  });

  it('shows legacy previews and removes the preview column when disabled', async () => {
    const fixture = TestBed.createComponent(Projects);
    fixture.componentRef.setInput('projects', [PROJECTS[0]]);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.project-preview')).not.toBeNull();
    fixture.componentRef.setInput('projects', [{ ...PROJECTS[0], showPreview: false }]);
    await fixture.whenStable();
    expect(root.querySelector('.project-preview')).toBeNull();
    expect(root.querySelector('.with-preview')).toBeNull();
    expect(root.querySelector('.project-summary')?.textContent).toBe(PROJECTS[0].summary);
    expect(root.querySelector('.project-details')).not.toBeNull();
  });
  it('handles an empty collection without stale details', async () => {
    const fixture = TestBed.createComponent(Projects);
    await fixture.whenStable();
    fixture.componentRef.setInput('projects', []);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('#featured-project')).toBeNull();
    expect(root.querySelector('.project-details')).toBeNull();
    expect(root.textContent).toContain('Novos projetos serão adicionados');
  });
});
