import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NonGbvProcessDetails } from './non-gbv-process-details';

describe('NonGbvProcessDetails', () => {
  let component: NonGbvProcessDetails;
  let fixture: ComponentFixture<NonGbvProcessDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NonGbvProcessDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NonGbvProcessDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
