import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GBVManagement } from './gbv-management';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GBVManagement', () => {
  let component: GBVManagement;
  let fixture: ComponentFixture<GBVManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GBVManagement],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: null }),
            snapshot: { paramMap: { get: () => null } }
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GBVManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
