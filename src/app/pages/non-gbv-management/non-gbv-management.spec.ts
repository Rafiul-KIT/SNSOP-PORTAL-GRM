import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NonGbvManagement } from './non-gbv-management';

describe('NonGbvManagement', () => {
  let component: NonGbvManagement;
  let fixture: ComponentFixture<NonGbvManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NonGbvManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NonGbvManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
