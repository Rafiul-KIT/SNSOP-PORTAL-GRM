import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NonGbvDetails } from './non-gbv-details';

describe('NonGbvDetails', () => {
  let component: NonGbvDetails;
  let fixture: ComponentFixture<NonGbvDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NonGbvDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NonGbvDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
