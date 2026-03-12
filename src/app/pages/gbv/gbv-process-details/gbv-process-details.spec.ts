import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GbvProcessDetails } from './gbv-process-details';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';

describe('GbvProcessDetails', () => {
  let component: GbvProcessDetails;
  let fixture: ComponentFixture<GbvProcessDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GbvProcessDetails],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => '1' } }
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GbvProcessDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
