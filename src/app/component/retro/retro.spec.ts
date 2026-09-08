import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Retro } from './retro';

describe('Retro', () => {
  let component: Retro;
  let fixture: ComponentFixture<Retro>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Retro]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Retro);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
