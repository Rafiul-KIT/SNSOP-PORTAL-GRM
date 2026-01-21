import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GbvManagement } from './gbv-management';

describe('GbvManagement', () => {
  let component: GbvManagement;
  let fixture: ComponentFixture<GbvManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GbvManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GbvManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
