import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TldrawComponent } from './tldraw.component';

describe('TldrawComponent', () => {
  let component: TldrawComponent;
  let fixture: ComponentFixture<TldrawComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TldrawComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TldrawComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
