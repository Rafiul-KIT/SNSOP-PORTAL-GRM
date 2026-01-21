import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExcelImporting } from './excel-importing';

describe('ExcelImporting', () => {
  let component: ExcelImporting;
  let fixture: ComponentFixture<ExcelImporting>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExcelImporting]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExcelImporting);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
