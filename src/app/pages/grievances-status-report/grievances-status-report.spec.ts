import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrievancesStatusReport } from './grievances-status-report';

describe('GrievancesStatusReport', () => {
  let component: GrievancesStatusReport;
  let fixture: ComponentFixture<GrievancesStatusReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrievancesStatusReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GrievancesStatusReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
