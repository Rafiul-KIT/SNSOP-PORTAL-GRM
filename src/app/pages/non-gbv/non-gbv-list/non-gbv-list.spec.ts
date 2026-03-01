import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NonGbvList } from './non-gbv-list';

describe('NonGbvList', () => {
  let component: NonGbvList;
  let fixture: ComponentFixture<NonGbvList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NonGbvList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NonGbvList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
