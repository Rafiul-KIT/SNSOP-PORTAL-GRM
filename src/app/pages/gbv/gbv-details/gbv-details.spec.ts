import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GbvDetails } from './gbv-details';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';

describe('GbvDetails', () => {
  let component: GbvDetails;
  let fixture: ComponentFixture<GbvDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GbvDetails],
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

    fixture = TestBed.createComponent(GbvDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
