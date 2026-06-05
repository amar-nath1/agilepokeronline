import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScrumPoker } from './scrum-poker';

describe('ScrumPoker', () => {
  let component: ScrumPoker;
  let fixture: ComponentFixture<ScrumPoker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScrumPoker]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScrumPoker);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
