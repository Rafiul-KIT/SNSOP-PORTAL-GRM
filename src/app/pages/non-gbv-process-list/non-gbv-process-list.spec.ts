import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NonGbvProcessList } from './non-gbv-process-list';

describe('NonGbvProcessList', () => {
  let component: NonGbvProcessList;
  let fixture: ComponentFixture<NonGbvProcessList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NonGbvProcessList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NonGbvProcessList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
