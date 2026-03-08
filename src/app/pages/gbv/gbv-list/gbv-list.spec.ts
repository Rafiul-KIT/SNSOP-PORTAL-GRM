import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GbvList } from './gbv-list';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';

describe('GbvList', () => {
  let component: GbvList;
  let fixture: ComponentFixture<GbvList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GbvList],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => null } }
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GbvList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
