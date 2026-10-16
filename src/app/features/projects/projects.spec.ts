import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROJECTS, Project } from './project';
import { Projects } from './projects';

const SECOND: Project = {
  ...PROJECTS[0], id: 'test', name: 'Projeto de teste', author: 'Outro autor', mark: 'T',
  summary: 'Resumo de teste', technologies: ['Outra tecnologia'], collectionStack: 'Outra tecnologia',
  demoRoute: '/test-demo', demoLabel: 'Abrir teste', detailsTitle: 'Detalhes de teste',
  details: [{title: 'Decisão de teste', description: 'Descrição de teste'}],
};

describe('Project selection with the existing layout', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideRouter([])]});
    vi.stubGlobal('matchMedia', vi.fn(() => ({matches: true})));
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
    const item = root.querySelectorAll<HTMLAnchorElement>('.project-listing')[1];
    item.focus();
    const event = new MouseEvent('click', {bubbles:true, cancelable:true});
    item.dispatchEvent(event);
    await fixture.whenStable();
    expect(event.defaultPrevented).toBe(true);
    expect(root.querySelector('#featured-title')?.textContent).toBe(SECOND.name);
    expect(root.querySelector('.project-summary')?.textContent).toBe(SECOND.summary);
    expect(root.querySelector('.technology-list')?.textContent).toContain(SECOND.technologies[0]);
    expect(root.querySelector('.project-actions a')?.getAttribute('href')).toBe(SECOND.demoRoute);
    expect(root.querySelector('#details-title')?.textContent).toBe(SECOND.detailsTitle);
    expect(root.querySelector('.details-grid')?.textContent).toContain(SECOND.details[0].description);
    expect(item.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(item);
    expect(item.querySelector('div > h3')).not.toBeNull();
    expect(item.querySelector('div > p')).not.toBeNull();
  });

  it('supports Space activation and preserves selection when the collection is refreshed', async () => {
    const fixture = TestBed.createComponent(Projects);
    fixture.componentRef.setInput('projects', [PROJECTS[0], SECOND]);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const event = new KeyboardEvent('keydown', {key:' ', code:'Space', bubbles:true, cancelable:true});
    root.querySelectorAll('.project-listing')[1].dispatchEvent(event);
    await fixture.whenStable();
    expect(event.defaultPrevented).toBe(true);
    expect(root.querySelector('#featured-title')?.textContent).toBe(SECOND.name);
    fixture.componentRef.setInput('projects', [PROJECTS[0], {...SECOND, summary:'Atualizado'}]);
    await fixture.whenStable();
    expect(root.querySelector('.project-summary')?.textContent).toBe('Atualizado');
    fixture.componentRef.setInput('projects', [PROJECTS[0]]);
    await fixture.whenStable();
    expect(root.querySelector('#featured-title')?.textContent).toBe(PROJECTS[0].name);
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
