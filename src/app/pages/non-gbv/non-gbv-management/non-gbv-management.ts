import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { FileUploadModule } from 'primeng/fileupload';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { LookupService } from '../../../services/lookup.service';
import { ApiService } from '../../../services/api.service';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import Swal from 'sweetalert2';
import { validateFile } from '../../../utils/file-validation.util';

@Component({
  selector: 'app-non-gbv-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
    DatePickerModule,
    FileUploadModule,
    RadioButtonModule,
    ButtonModule,
    InputNumberModule,
    DialogModule,
    BreadcrumbModule,
  ],
  templateUrl: './non-gbv-management.html',
  styleUrls: ['./non-gbv-management.scss'],
})
export class NonGbvManagement implements OnInit, OnDestroy {
  grievanceForm!: FormGroup;
  today: Date = new Date();
  isLoading = false;
  private subscriptions: Subscription[] = [];

  items: MenuItem[] | undefined;
  home: MenuItem | undefined;

  // Dropdown options
  states: any[] = [];
  counties: any[] = [];
  payams: any[] = [];
  bomas: any[] = [];
  reportingChannels: any[] = [];
  genders: any[] = [];
  supportTypes = [
    { label: 'LIPW', value: 0 },
    { label: 'DIS', value: 1 },
  ];
  categories: any[] = [];
  grievanceTypes: any[] = [];
  displaySavedIssueDialog = false;
  savedIssueSummary: { label: string; value: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private lookupService: LookupService,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.items = [{ label: 'Non-GBV Management' }];
    this.home = { icon: 'pi pi-home', routerLink: '/dashboard' };
    this.initForm();
    this.registerConditionalValidationWatchers();
    this.loadStates();
    this.loadGenders();
    this.loadReportingChannels();
    this.loadGrievanceCategories();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  loadGrievanceCategories(): void {
    this.apiService
      .GET('api/grievance/type')
      .then((res: any) => {
        const data = res?.data;
        if (data && data.content) {
          this.categories = data.content
            .filter((item: any) => item.status === true)
            .map((item: any) => ({
              label: item.details,
              value: item.id,
            }));
          this.cdr.detectChanges();
        }
      })
      .catch((err) => {
        console.error('Error fetching grievance categories', err);
      });
  }

  isOtherReportingChannelSelected(): boolean {
    const selectedId = this.grievanceForm.get('reportingChannel')?.value;
    if (!selectedId) return false;

    const selected = this.reportingChannels.find((channel) => channel.value === selectedId);
    return selected?.label?.toLowerCase?.().includes('other') ?? false;
  }

  isOtherCategorySelected(): boolean {
    const selectedId = this.grievanceForm.get('categoryOfGrievance')?.value;
    if (!selectedId) return false;
    const selected = this.categories.find((item) => item.value === selectedId);
    return selected?.label?.toLowerCase?.().includes('other') ?? false;
  }

  isOtherTypeSelected(): boolean {
    const selectedId = this.grievanceForm.get('typeOfGrievance')?.value;
    if (!selectedId) return false;
    const selected = this.grievanceTypes.find((item) => item.value === selectedId);
    return selected?.label?.toLowerCase?.().includes('other') ?? false;
  }

  onCategoryChange(event: any): void {
    const categoryId = event.value;
    this.grievanceTypes = [];
    this.grievanceForm.patchValue({ typeOfGrievance: null, typeOfGrievanceOther: '' });

    if (categoryId) {
      if (this.isOtherCategorySelected()) {
        this.grievanceForm.get('typeOfGrievance')?.disable();
        this.grievanceForm.get('typeOfGrievanceOther')?.enable();
        this.syncGrievanceTypeValidators();
      } else {
        this.grievanceForm.get('typeOfGrievance')?.enable();
        this.grievanceForm.get('typeOfGrievanceOther')?.disable();
        this.syncGrievanceTypeValidators();
        
        this.apiService
          .GET(`api/grievance/detail-type`, { type: categoryId })
          .then((res: any) => {
            const data = res?.data;
            if (data && data.content) {
              this.grievanceTypes = data.content
                .filter((item: any) => item.status === true)
                .map((item: any) => ({
                  label: item.details,
                  value: item.id,
                }));
              this.syncGrievanceTypeValidators();
              this.cdr.detectChanges();
            }
          })
          .catch((err) => {
            console.error('Error fetching grievance types', err);
          });
      }
    } else {
      this.grievanceForm.get('typeOfGrievance')?.disable();
      this.grievanceForm.get('typeOfGrievanceOther')?.disable();
      this.syncGrievanceTypeValidators();
    }
    this.cdr.detectChanges();
  }

  onTypeChange(_: any): void {
    this.grievanceForm.patchValue({ typeOfGrievanceOther: '' });
    this.syncGrievanceTypeValidators();
    this.cdr.detectChanges();
  }

  loadReportingChannels(): void {
    this.apiService
      .GET('api/grievance/reporting-channel')
      .then((res: any) => {
        const data = res?.data;
        if (data && data.content) {
          this.reportingChannels = data.content
            .filter((item: any) => item.ngbvChannel === true)
            .map((item: any) => ({
              label: item.detail,
              value: item.id,
            }));
          this.cdr.detectChanges();
        }
      })
      .catch((err) => {
        console.error('Error fetching reporting channels', err);
      });
  }

  loadGenders(): void {
    const data = this.lookupService.getGenderListbyId();
    this.genders = data.map((item) => ({
      label: item.name,
      value: parseInt(item.id),
    }));
  }

  initForm(): void {
    this.grievanceForm = this.fb.group({
      serialNumber: [{ value: '', disabled: true }],
      date: [this.today],
      stateName: [null, Validators.required],
      countyName: [null, Validators.required],
      payamName: [null, Validators.required],
      bomaName: [null, Validators.required],
      description: ['', [Validators.required, this.trimRequiredValidator(), Validators.maxLength(3000)]],
      attachment: [null, Validators.required],
      reportingChannel: [null, Validators.required],
      otherReportingChannel: [''],
      dateComplaint: [null, Validators.required],
      contactNumber: [''],
      complainantName: ['', Validators.required],
      gender: [null],
      physicalAddress: [''],
      isBeneficiary: [true],
      age: [null],
      supportType: [null],
      categoryOfGrievance: [null, Validators.required],
      typeOfGrievance: [{ value: null, disabled: true }],
      typeOfGrievanceOther: [{ value: '', disabled: true }],
    });
  }

  private registerConditionalValidationWatchers(): void {
    const beneficiaryCtrl = this.grievanceForm.get('isBeneficiary');
    if (!beneficiaryCtrl) return;
    this.subscriptions.push(
      beneficiaryCtrl.valueChanges.subscribe((val) => this.syncSupportTypeValidator(val))
    );
    this.syncSupportTypeValidator(beneficiaryCtrl.value);

    const categoryCtrl = this.grievanceForm.get('categoryOfGrievance');
    if (categoryCtrl) {
      this.subscriptions.push(
        categoryCtrl.valueChanges.subscribe(() => this.syncGrievanceTypeValidators())
      );
    }

    const typeCtrl = this.grievanceForm.get('typeOfGrievance');
    if (typeCtrl) {
      this.subscriptions.push(
        typeCtrl.valueChanges.subscribe(() => this.syncGrievanceTypeValidators())
      );
    }

    this.syncGrievanceTypeValidators();
  }

  private syncSupportTypeValidator(beneficiaryValue: any): void {
    const ctrl = this.grievanceForm.get('supportType');
    if (!ctrl) return;
    if (beneficiaryValue === true) {
      ctrl.setValidators([this.nullNotAllowedValidator()]);
    } else {
      ctrl.setValue(null, { emitEvent: false });
      ctrl.setValidators(null);
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private syncGrievanceTypeValidators(): void {
    const typeCtrl = this.grievanceForm.get('typeOfGrievance');
    const typeOtherCtrl = this.grievanceForm.get('typeOfGrievanceOther');
    if (!typeCtrl || !typeOtherCtrl) return;

    const hasCategory = !!this.grievanceForm.get('categoryOfGrievance')?.value;
    const isOtherCategory = this.isOtherCategorySelected();
    const isOtherType = this.isOtherTypeSelected();

    if (!hasCategory) {
      typeCtrl.setValidators(null);
      typeOtherCtrl.setValidators(null);
      typeCtrl.disable({ emitEvent: false });
      typeOtherCtrl.disable({ emitEvent: false });
      typeCtrl.setValue(null, { emitEvent: false });
      typeOtherCtrl.setValue('', { emitEvent: false });
      typeCtrl.updateValueAndValidity({ emitEvent: false });
      typeOtherCtrl.updateValueAndValidity({ emitEvent: false });
      return;
    }

    if (isOtherCategory) {
      typeCtrl.setValidators(null);
      typeOtherCtrl.setValidators([Validators.required]);
      typeCtrl.disable({ emitEvent: false });
      typeOtherCtrl.enable({ emitEvent: false });
      typeCtrl.setValue(null, { emitEvent: false });
      typeCtrl.updateValueAndValidity({ emitEvent: false });
      typeOtherCtrl.updateValueAndValidity({ emitEvent: false });
      return;
    }

    typeCtrl.setValidators([this.nullNotAllowedValidator()]);
    typeOtherCtrl.setValidators(isOtherType ? [Validators.required] : null);
    typeCtrl.enable({ emitEvent: false });

    if (isOtherType) {
      typeOtherCtrl.enable({ emitEvent: false });
    } else {
      typeOtherCtrl.disable({ emitEvent: false });
      typeOtherCtrl.setValue('', { emitEvent: false });
    }

    typeCtrl.updateValueAndValidity({ emitEvent: false });
    typeOtherCtrl.updateValueAndValidity({ emitEvent: false });
  }

  isBeneficiarySelected(): boolean {
    return this.grievanceForm.get('isBeneficiary')?.value === true;
  }

  private formatDateForApi(value: Date | string | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private nullNotAllowedValidator(): ValidatorFn {
    return (ctrl: AbstractControl): ValidationErrors | null =>
      ctrl.value === null || ctrl.value === undefined ? { required: true } : null;
  }

  private trimRequiredValidator(): ValidatorFn {
    return (ctrl: AbstractControl): ValidationErrors | null => {
      if (ctrl.value === null || ctrl.value === undefined) return null;
      if (typeof ctrl.value !== 'string') return null;
      return ctrl.value.trim().length === 0 ? { required: true } : null;
    };
  }

  private toDisplayValue(value: any): string {
    if (value === null || value === undefined) return '--';
    const text = String(value).trim();
    return text.length ? text : '--';
  }

  private extractTrackingNumber(message: any): string | null {
    if (typeof message !== 'string' || !message.trim()) return null;
    const match = message.match(/Tracking\s*(?:No|Number)\s*:\s*([A-Za-z0-9-]+)/i);
    return match?.[1]?.trim() || null;
  }

  private findOptionLabel(options: any[], value: any): string {
    const found = options?.find((item: any) => item?.value === value);
    return this.toDisplayValue(found?.label);
  }

  private booleanLabel(value: any): string {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return '--';
  }

  private buildSavedIssueSummary(formValue: any, result: any): { label: string; value: string }[] {
    const content = result?.content || result?.data || {};
    const trackingNumberFromMessage = this.extractTrackingNumber(result?.message);
    const trackingNumber = content?.trackingNumber || trackingNumberFromMessage || '--';
    const complaintDate = this.formatDateForApi(formValue?.dateComplaint) || '--';

    return [
      { label: 'Tracking Number', value: this.toDisplayValue(trackingNumber) },
      { label: 'Complaint Date', value: this.toDisplayValue(complaintDate) },
      { label: 'State', value: this.findOptionLabel(this.states, formValue?.stateName) },
      { label: 'County', value: this.findOptionLabel(this.counties, formValue?.countyName) },
      { label: 'Payam', value: this.findOptionLabel(this.payams, formValue?.payamName) },
      { label: 'Boma', value: this.findOptionLabel(this.bomas, formValue?.bomaName) },
      { label: 'Complainant Name', value: this.toDisplayValue(formValue?.complainantName) },
      { label: 'Gender', value: this.findOptionLabel(this.genders, formValue?.gender) },
      { label: 'Contact Number', value: this.toDisplayValue(formValue?.contactNumber) },
      { label: 'Reporting Channel', value: this.findOptionLabel(this.reportingChannels, formValue?.reportingChannel) },
      { label: 'Beneficiary', value: this.booleanLabel(formValue?.isBeneficiary) },
      { label: 'Support Type', value: this.findOptionLabel(this.supportTypes, formValue?.supportType) },
      { label: 'Grievance Category', value: this.findOptionLabel(this.categories, formValue?.categoryOfGrievance) },
      { label: 'Grievance Type', value: this.findOptionLabel(this.grievanceTypes, formValue?.typeOfGrievance) },
      { label: 'Description', value: this.toDisplayValue(formValue?.description) },
      { label: 'Attachment', value: this.toDisplayValue(formValue?.attachment?.name) },
      { label: 'Note', value: this.toDisplayValue(result?.message) },
    ];
  }

  private escapePdfText(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  private wrapPdfText(text: string, maxCharsPerLine: number): string[] {
    const normalized = (text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return ['--'];

    const words = normalized.split(' ');
    const lines: string[] = [];
    let current = '';

    words.forEach((word) => {
      if (word.length > maxCharsPerLine) {
        if (current) {
          lines.push(current);
          current = '';
        }
        let start = 0;
        while (start < word.length) {
          lines.push(word.slice(start, start + maxCharsPerLine));
          start += maxCharsPerLine;
        }
        return;
      }

      const next = current ? `${current} ${word}` : word;
      if (next.length <= maxCharsPerLine) {
        current = next;
      } else {
        lines.push(current);
        current = word;
      }
    });

    if (current) lines.push(current);
    return lines.length ? lines : ['--'];
  }

  private pdfTextCommand(
    x: number,
    y: number,
    text: string,
    fontKey: 'F1' | 'F2',
    fontSize: number,
    rgb: [number, number, number] = [0, 0, 0]
  ): string {
    return `BT /${fontKey} ${fontSize} Tf ${rgb[0]} ${rgb[1]} ${rgb[2]} rg ${x} ${y} Td (${this.escapePdfText(text)}) Tj ET`;
  }

  downloadSavedIssuePdf(): void {
    if (!this.savedIssueSummary.length) return;
    const trackingNumber = this.toDisplayValue(
      this.savedIssueSummary.find((row) => row.label === 'Tracking Number')?.value
    );
    const safeTrackingNumber = trackingNumber !== '--'
      ? trackingNumber.replace(/[^A-Za-z0-9-_]/g, '')
      : 'NA';

    const pageWidth = 595;
    const pageHeight = 842;
    const marginX = 40;
    const marginBottom = 36;
    const tableStartYFirstPage = 710;
    const tableStartYOtherPages = 770;
    const contentWidth = pageWidth - (marginX * 2);
    const labelColWidth = 180;
    const rowPadding = 6;
    const rowLineHeight = 11;
    const maxLabelChars = 34;
    const maxValueChars = 58;

    const formatGeneratedAt = (): string => {
      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      return `${date} ${time}`;
    };

    const pages: string[][] = [];
    let activePageIndex = -1;
    let y = 0;

    const startNewPage = (isFirstPage: boolean): void => {
      pages.push([]);
      activePageIndex += 1;
      const cmds = pages[activePageIndex];

      cmds.push('q 0.08 0.37 0.75 rg 0 790 595 52 re f Q');
      cmds.push(this.pdfTextCommand(42, 820, isFirstPage ? 'Non-GBV Issue Summary' : 'Non-GBV Issue Summary (Continued)', 'F2', 16, [1, 1, 1]));
      cmds.push(this.pdfTextCommand(42, 798, `Generated At: ${formatGeneratedAt()}`, 'F1', 10, [1, 1, 1]));
      cmds.push('q 0.95 0.95 0.95 rg 40 758 515 22 re f Q');
      cmds.push('q 0.82 0.84 0.88 RG 1 w 40 758 515 22 re S Q');
      cmds.push(this.pdfTextCommand(46, 764, 'Case Snapshot', 'F2', 10, [0.2, 0.2, 0.2]));
      cmds.push(this.pdfTextCommand(180, 764, trackingNumber, 'F1', 10, [0.2, 0.2, 0.2]));

      const tableHeaderY = isFirstPage ? 730 : 790;
      cmds.push(`q 0.16 0.24 0.36 rg 40 ${tableHeaderY - 2} 515 22 re f Q`);
      cmds.push(this.pdfTextCommand(46, tableHeaderY + 5, 'Field', 'F2', 10, [1, 1, 1]));
      cmds.push(this.pdfTextCommand(226, tableHeaderY + 5, 'Value', 'F2', 10, [1, 1, 1]));
      y = isFirstPage ? tableStartYFirstPage : tableStartYOtherPages;
    };

    startNewPage(true);

    this.savedIssueSummary.forEach((row, index) => {
      const labelLines = this.wrapPdfText(this.toDisplayValue(row.label), maxLabelChars);
      const valueLines = this.wrapPdfText(this.toDisplayValue(row.value), maxValueChars);
      const textLineCount = Math.max(labelLines.length, valueLines.length);
      const rowHeight = rowPadding + (textLineCount * rowLineHeight) + rowPadding;

      if (y - rowHeight < marginBottom) {
        startNewPage(false);
      }

      const rowY = y - rowHeight;
      const cmds = pages[activePageIndex];

      if (index % 2 === 0) {
        cmds.push(`q 0.975 0.98 0.99 rg ${marginX} ${rowY} ${contentWidth} ${rowHeight} re f Q`);
      }
      cmds.push(`q 0.86 0.88 0.9 RG 1 w ${marginX} ${rowY} ${contentWidth} ${rowHeight} re S Q`);
      cmds.push(`q 0.9 0.9 0.9 RG 1 w ${marginX + labelColWidth} ${rowY} m ${marginX + labelColWidth} ${rowY + rowHeight} l S Q`);

      labelLines.forEach((line, i) => {
        cmds.push(this.pdfTextCommand(marginX + 6, y - rowPadding - ((i + 1) * rowLineHeight) + 2, line, 'F2', 9));
      });
      valueLines.forEach((line, i) => {
        cmds.push(this.pdfTextCommand(marginX + labelColWidth + 6, y - rowPadding - ((i + 1) * rowLineHeight) + 2, line, 'F1', 9));
      });

      y -= rowHeight;
    });

    const totalPages = pages.length;
    pages.forEach((cmds, idx) => {
      cmds.push('q 0.8 0.8 0.8 RG 1 w 40 26 m 555 26 l S Q');
      cmds.push(this.pdfTextCommand(42, 14, 'Generated by Non-GBV Management Portal', 'F1', 9, [0.38, 0.38, 0.38]));
      cmds.push(this.pdfTextCommand(500, 14, `Page ${idx + 1} of ${totalPages}`, 'F1', 9, [0.38, 0.38, 0.38]));
    });

    const streams = pages.map((cmds) => cmds.join('\n'));
    const pageIds: number[] = [];
    const contentIds: number[] = [];
    let nextObjectId = 5;
    streams.forEach(() => {
      contentIds.push(nextObjectId);
      nextObjectId += 1;
      pageIds.push(nextObjectId);
      nextObjectId += 1;
    });

    const lastObjectId = nextObjectId - 1;
    const objectMap = new Map<number, string>();
    objectMap.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
    objectMap.set(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
    objectMap.set(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    objectMap.set(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    streams.forEach((stream, i) => {
      const contentId = contentIds[i];
      const pageId = pageIds[i];
      objectMap.set(contentId, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      objectMap.set(
        pageId,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
      );
    });

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    for (let id = 1; id <= lastObjectId; id += 1) {
      const body = objectMap.get(id) || '';
      offsets[id] = pdf.length;
      pdf += `${id} 0 obj\n${body}\nendobj\n`;
    }

    const xrefStart = pdf.length;
    pdf += `xref\n0 ${lastObjectId + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let id = 1; id <= lastObjectId; id += 1) {
      pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${lastObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    const blob = new Blob([pdf], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ngbv-${safeTrackingNumber}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  loadStates(): void {
    this.lookupService.getOrFetchStateList().then((data) => {
      this.states = data.map((item) => ({
        label: item.name,
        value: parseInt(item.id),
      }));
      this.cdr.detectChanges();
    });
  }

  onStateChange(event: any): void {
    const stateId = event.value;
    this.counties = [];
    this.payams = [];
    this.bomas = [];
    this.grievanceForm.patchValue({
      countyName: null,
      payamName: null,
      bomaName: null,
    });

    if (stateId) {
      this.lookupService
        .getCountyListByStateId(stateId.toString())
        .then((data) => {
          this.counties = data.map((item) => ({
            label: item.name,
            value: parseInt(item.id),
          }));
          this.cdr.detectChanges();
        });
    } else {
      this.cdr.detectChanges();
    }
  }

  onCountyChange(event: any): void {
    const countyId = event.value;
    this.payams = [];
    this.bomas = [];
    this.grievanceForm.patchValue({ payamName: null, bomaName: null });

    if (countyId) {
      this.lookupService
        .getPayamListByCountyId(countyId.toString())
        .then((data) => {
          this.payams = data.map((item) => ({
            label: item.name,
            value: parseInt(item.id),
          }));
          this.cdr.detectChanges();
        });
    } else {
      this.cdr.detectChanges();
    }
  }

  onPayamChange(event: any): void {
    const payamId = event.value;
    this.bomas = [];
    this.grievanceForm.patchValue({ bomaName: null });

    if (payamId) {
      this.lookupService
        .getBomaListByPayamId(payamId.toString())
        .then((data) => {
          this.bomas = data.map((item) => ({
            label: item.name,
            value: parseInt(item.id),
          }));
          this.cdr.detectChanges();
        });
    } else {
      this.cdr.detectChanges();
    }
  }

  onSubmit(): void {
    this.syncSupportTypeValidator(this.grievanceForm.get('isBeneficiary')?.value);
    const rawDescription = this.grievanceForm.get('description')?.value;
    if (typeof rawDescription === 'string') {
      this.grievanceForm.get('description')?.setValue(rawDescription.trim(), { emitEvent: false });
    }

    if (this.grievanceForm.valid) {
      this.isLoading = true;
      const rawValues = this.grievanceForm.getRawValue();
      const grievanceDescription =
        typeof rawValues.description === 'string' && rawValues.description.trim().length
          ? rawValues.description.trim()
          : 'N/A';

      const formData = new FormData();

      // ── Required fields ────────────────────────────────────────────────
      formData.append('stateId', String(rawValues.stateName));
      formData.append('countyId', String(rawValues.countyName));
      formData.append('payamId', String(rawValues.payamName));
      formData.append('bomaId', String(rawValues.bomaName));
      formData.append('incidentOccurredAt', this.formatDateForApi(rawValues.dateComplaint));
      formData.append('reportingChannelId', String(rawValues.reportingChannel));
      formData.append('complainantName', rawValues.complainantName);
      formData.append('grievanceTypeId', String(rawValues.categoryOfGrievance));
      formData.append('grievanceDescription', grievanceDescription);

      // ── Optional fields (only append when user provided a value) ───────
      if (rawValues.serialNumber) formData.append('trackingNumber', rawValues.serialNumber);
      if (rawValues.otherReportingChannel?.trim()) formData.append('reportingChannelOther', rawValues.otherReportingChannel.trim());
      if (rawValues.contactNumber?.trim()) formData.append('complainantContact', rawValues.contactNumber.trim());
      if (rawValues.physicalAddress?.trim()) formData.append('complainantPhysicalAddress', rawValues.physicalAddress.trim());
      if (rawValues.gender !== null && rawValues.gender !== undefined) formData.append('complainantGender', String(rawValues.gender));
      if (rawValues.age !== null && rawValues.age !== undefined) formData.append('complainantAge', String(rawValues.age));
      if (rawValues.isBeneficiary !== null && rawValues.isBeneficiary !== undefined) formData.append('complainantBeneficiary', String(rawValues.isBeneficiary));
      if (rawValues.supportType !== null && rawValues.supportType !== undefined) formData.append('complainantBeneficiarySelectionCriteria', String(rawValues.supportType));
      if (rawValues.typeOfGrievance !== null && rawValues.typeOfGrievance !== undefined) formData.append('grievanceDetailTypeId', String(rawValues.typeOfGrievance));
      if (rawValues.typeOfGrievanceOther?.trim()) formData.append('grievanceTypeOtherDesc', rawValues.typeOfGrievanceOther.trim());
      if (rawValues.attachment?.name) formData.append('grievanceAttachmentUrl', '');

      // ── File attachment ────────────────────────────────────────────────
      if (rawValues.attachment) {
        formData.append('grievanceAttachmentFile', rawValues.attachment, rawValues.attachment.name);
        formData.append('grievanceAttachmentFilename', rawValues.attachment.name);
      }

      this.apiService
        .POST('api/ngbv-grievance/save', formData, 'global', { headers: { 'Content-Type': undefined } })
        .then((res: any) => {
          const result = res?.data;
          if (result && result.code === 200) {
            this.savedIssueSummary = this.buildSavedIssueSummary(rawValues, result);
            this.displaySavedIssueDialog = true;
            this.onReset();
          } else {
            Swal.fire({
              title: 'Failed',
              text: result?.message || 'Failed to submit grievance.',
              icon: 'error',
              confirmButtonColor: '#0d6efd',
            });
          }
        })
        .catch((err: any) => {
          console.error('Error saving grievance', err);
          Swal.fire({
            title: 'Error!',
            text: 'An error occurred while submitting the grievance.',
            icon: 'error',
            confirmButtonColor: '#0d6efd',
          });
        })
        .finally(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
    } else {
      Object.keys(this.grievanceForm.controls).forEach((key) => {
        const control = this.grievanceForm.get(key);
        control?.markAsTouched();
      });
      Swal.fire({
        title: 'Validation Error',
        text: 'Please fill in all required fields marked with *',
        icon: 'warning',
        confirmButtonColor: '#0d6efd',
      });
    }
  }

  onReset(): void {
    this.grievanceForm.reset({
      date: this.today,
      isBeneficiary: true,
      categoryOfGrievance: null,
    });
    this.grievanceForm.get('typeOfGrievance')?.disable();
    this.grievanceForm.get('typeOfGrievanceOther')?.disable();
    this.counties = [];
    this.payams = [];
    this.bomas = [];
    this.grievanceTypes = [];
    this.syncSupportTypeValidator(true);
    this.cdr.detectChanges();
  }

  onFileSelect(event: any): void {
    const file = validateFile(event);
    if (!file) return;

    this.grievanceForm.patchValue({
      attachment: file,
    });
  }
}
