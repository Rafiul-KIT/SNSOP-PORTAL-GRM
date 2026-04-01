import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { ApiService } from '../../services/api.service';

const GBV_COLUMNS = [
  'trackingNumber',
  'complainantBeneficiarySelectionCriteria',
  'countyId',
  'incidentReportedByOtherDesc',
  'contactFocalPersonName',
  'complainantBeneficiary',
  'grievanceAttachmentFilename',
  'consentFormAttachmentFilename',
  'consentFormAttachmentBytes',
  'grievanceAttachmentBytes',
  'incidentOccurredAt',
  'verbalConsentGranted',
  'suspectDetails',
  'complainantContactNumber',
  'stateId',
  'ageOfSurvivor',
  'suspectKnown',
  'consentFormAttachmentUrl',
  'grievanceAttachmentUrl',
  'payamId',
  'reportingChannelId',
  'consentSigned',
  'suspectAssociatedWithProject',
  'recommendedReferralServiceId',
  'reportingChannelOther',
  'id',
  'incidentReportedBy',
  'bomaId',
  'grievanceAttachmentFile',
  'consentFormAttachmentFile',
  'grievanceDescription',
  'complainantGender',
] as const;

const NGBV_COLUMNS = [
  'trackingNumber',
  'complainantAge',
  'complainantContact',
  'complainantBeneficiarySelectionCriteria',
  'grievanceDetailTypeId',
  'countyId',
  'complainantBeneficiary',
  'grievanceAttachmentFilename',
  'complainantName',
  'grievanceTypeOtherDesc',
  'grievanceAttachmentBytes',
  'incidentOccurredAt',
  'stateId',
  'grievanceAttachmentUrl',
  'payamId',
  'reportingChannelId',
  'grievanceTypeId',
  'reportingChannelOther',
  'id',
  'bomaId',
  'grievanceAttachmentFile',
  'grievanceDescription',
  'complainantGender',
  'complainantPhysicalAddress',
] as const;

const GBV_REQUIRED = [
  'stateId',
  'countyId',
  'payamId',
  'bomaId',
  'incidentOccurredAt',
  'contactFocalPersonName',
  'reportingChannelId',
  'complainantGender',
  'ageOfSurvivor',
  'complainantBeneficiary',
  'grievanceDescription',
] as const;

const NGBV_REQUIRED = [
  'stateId',
  'countyId',
  'payamId',
  'bomaId',
  'incidentOccurredAt',
  'reportingChannelId',
  'complainantName',
  'grievanceTypeId',
  'grievanceDescription',
] as const;

const GBV_BOOLEAN_FIELDS = [
  'complainantBeneficiary',
  'verbalConsentGranted',
  'suspectKnown',
  'consentSigned',
  'suspectAssociatedWithProject',
] as const;

const NGBV_BOOLEAN_FIELDS = ['complainantBeneficiary'] as const;

const GBV_INT_FIELDS = [
  'id',
  'stateId',
  'countyId',
  'payamId',
  'bomaId',
  'incidentReportedBy',
  'reportingChannelId',
  'complainantGender',
  'ageOfSurvivor',
  'complainantBeneficiarySelectionCriteria',
  'recommendedReferralServiceId',
] as const;

const NGBV_INT_FIELDS = [
  'id',
  'stateId',
  'countyId',
  'payamId',
  'bomaId',
  'reportingChannelId',
  'grievanceTypeId',
  'grievanceDetailTypeId',
  'complainantGender',
  'complainantAge',
  'complainantBeneficiarySelectionCriteria',
] as const;

const GBV_SAMPLE_VALUES: Record<string, string> = {
  trackingNumber: 'GBV-0001',
  complainantBeneficiarySelectionCriteria: '0',
  countyId: '1',
  incidentReportedByOtherDesc: 'Reported by community member',
  contactFocalPersonName: 'John Doe',
  complainantBeneficiary: 'true',
  grievanceAttachmentFilename: '',
  consentFormAttachmentFilename: '',
  consentFormAttachmentBytes: '',
  grievanceAttachmentBytes: '',
  incidentOccurredAt: '2026-04-01',
  verbalConsentGranted: 'true',
  suspectDetails: 'Unknown male adult',
  complainantContactNumber: '0912345678',
  stateId: '1',
  ageOfSurvivor: '30',
  suspectKnown: 'false',
  consentFormAttachmentUrl: '',
  grievanceAttachmentUrl: '',
  payamId: '1',
  reportingChannelId: '1',
  consentSigned: 'true',
  suspectAssociatedWithProject: 'false',
  recommendedReferralServiceId: '',
  reportingChannelOther: '',
  id: '',
  incidentReportedBy: '1',
  bomaId: '1',
  grievanceAttachmentFile: '',
  consentFormAttachmentFile: '',
  grievanceDescription: 'Sample GBV grievance description',
  complainantGender: '1',
};

const NGBV_SAMPLE_VALUES: Record<string, string> = {
  trackingNumber: 'NGBV-0001',
  complainantAge: '34',
  complainantContact: '0912345678',
  complainantBeneficiarySelectionCriteria: '0',
  grievanceDetailTypeId: '1',
  countyId: '1',
  complainantBeneficiary: 'true',
  grievanceAttachmentFilename: '',
  complainantName: 'Jane Doe',
  grievanceTypeOtherDesc: '',
  grievanceAttachmentBytes: '',
  incidentOccurredAt: '2026-04-01',
  stateId: '1',
  grievanceAttachmentUrl: '',
  payamId: '1',
  reportingChannelId: '1',
  grievanceTypeId: '1',
  reportingChannelOther: '',
  id: '',
  bomaId: '1',
  grievanceAttachmentFile: '',
  grievanceDescription: 'Sample non-GBV grievance description',
  complainantGender: '1',
  complainantPhysicalAddress: 'Juba, Block A',
};

type PreviewRow = {
  values: any[];
  error: string | null;
};

@Component({
  selector: 'app-excel-importing',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, BreadcrumbModule],
  templateUrl: './excel-importing.html',
  styleUrls: ['./excel-importing.scss'],
})
export class ExcelImporting implements OnInit {
  items: MenuItem[] | undefined;
  home: MenuItem | undefined;

  selectedGBVType = '';
  selectedFile: File | null = null;
  isAnalyzing = false;
  isImporting = false;
  isPreview = false;
  analysisData: PreviewRow[] = [];
  analysisErrors: string[] = [];
  previewHeaders: string[] = [];
  private parsedRows: Record<string, any>[] = [];

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.items = [{ label: 'Excel File Importing' }];
    this.home = { icon: 'fas fa-home', routerLink: '/dashboard' };
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0] ?? null;
    if (!file) return;

    this.selectedFile = file;
    this.isPreview = false;
    this.analysisData = [];
    this.analysisErrors = [];
    this.previewHeaders = [];
    this.parsedRows = [];
  }

  downloadTemplate(): void {
    if (!this.selectedGBVType) {
      Swal.fire({
        title: 'Info',
        text: 'Please select a template type first.',
        icon: 'info',
        confirmButtonColor: '#0d6efd',
      });
      return;
    }

    const isGbv = this.selectedGBVType === 'type1';
    const columns = isGbv ? GBV_COLUMNS : NGBV_COLUMNS;
    const fileName = isGbv ? 'GBV_Import_Template.xlsx' : 'Non_GBV_Import_Template.xlsx';

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([[...columns]]);
    ws['!cols'] = columns.map((col) => ({ wch: Math.max(col.length + 2, 24) }));
    this.applyHeaderStyle(ws, columns.length);

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, fileName);
  }

  onAnalyze(): void {
    if (!this.selectedFile || !this.selectedGBVType) {
      Swal.fire({
        title: 'Info',
        text: 'Please select a type and upload a file.',
        icon: 'info',
        confirmButtonColor: '#0d6efd',
      });
      return;
    }

    this.isAnalyzing = true;
    this.isPreview = false;
    this.analysisData = [];
    this.analysisErrors = [];
    this.previewHeaders = [];
    this.parsedRows = [];

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const bstr = e.target?.result as string;
        const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });
        const ws: XLSX.WorkSheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as any[][];
        this.validateAndPreview(raw);
      } catch {
        this.analysisErrors.push('Error reading or parsing the Excel file. Please ensure it is a valid .xlsx file.');
      } finally {
        this.isAnalyzing = false;
        this.isPreview = true;
        this.cdr.detectChanges();
      }
    };
    reader.readAsBinaryString(this.selectedFile);
  }

  onImport(): void {
    if (this.getImportButtonDisabledState()) return;

    this.isImporting = true;
    this.cdr.detectChanges();

    const isGbv = this.selectedGBVType === 'type1';
    const endpoint = isGbv ? 'api/gbv-grievance/saveBatch' : 'api/ngbv-grievance/saveBatch';
    const list = this.parsedRows.map((row) => this.compactRow(row));
    const fd = new FormData();
    fd.append('list', new Blob([JSON.stringify(list)], { type: 'application/json' }));

    this.apiService
      .POST(endpoint, fd, 'global', { headers: { 'Content-Type': undefined } })
      .then((res: any) => {
        const result = res?.data;
        const isSuccess = result?.code === 200 || result?.success === true || res?.status === 200;
        if (isSuccess) {
          Swal.fire({
            title: 'Success',
            text: result?.message || `${list.length} row(s) imported successfully.`,
            icon: 'success',
            confirmButtonColor: '#059669',
          });
          this.reset();
        } else {
          Swal.fire({
            title: 'Failed',
            text: result?.message || 'Failed to import data.',
            icon: 'error',
            confirmButtonColor: '#0d6efd',
          });
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.message || err?.response?.data?.detail || 'An error occurred while importing.';
        Swal.fire({ title: 'Error', text: msg, icon: 'error', confirmButtonColor: '#0d6efd' });
      })
      .finally(() => {
        this.isImporting = false;
        this.cdr.detectChanges();
      });
  }

  reset(): void {
    this.selectedGBVType = '';
    this.selectedFile = null;
    this.isAnalyzing = false;
    this.isImporting = false;
    this.isPreview = false;
    this.analysisData = [];
    this.analysisErrors = [];
    this.previewHeaders = [];
    this.parsedRows = [];
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  getAlertClass(): { [key: string]: boolean } {
    const hasDataErrors = this.analysisData.some((d) => d.error);
    const hasHeaderMismatch = this.analysisErrors.some((e) => e.startsWith('Header mismatch'));
    const isSuccessful = !hasDataErrors && !hasHeaderMismatch && this.analysisErrors.length > 0;

    return {
      'alert-success': isSuccessful,
      'alert-danger': hasDataErrors || hasHeaderMismatch,
    };
  }

  getImportButtonDisabledState(): boolean {
    const hasDataErrors = this.analysisData.some((d) => d.error);
    const hasHeaderMismatch = this.analysisErrors.some((e) => e.startsWith('Header mismatch'));
    return this.isImporting || !this.isPreview || hasDataErrors || hasHeaderMismatch || this.parsedRows.length === 0;
  }

  private validateAndPreview(data: any[][]): void {
    const isGbv = this.selectedGBVType === 'type1';
    const columns = (isGbv ? GBV_COLUMNS : NGBV_COLUMNS) as readonly string[];
    const required = (isGbv ? GBV_REQUIRED : NGBV_REQUIRED) as readonly string[];
    const intFields = (isGbv ? GBV_INT_FIELDS : NGBV_INT_FIELDS) as readonly string[];
    const boolFields = (isGbv ? GBV_BOOLEAN_FIELDS : NGBV_BOOLEAN_FIELDS) as readonly string[];

    if (data.length < 2) {
      this.analysisErrors.push('The Excel file is empty or has only headers.');
      return;
    }

    const fileHeader = (data[0] || []).map((h: any) => String(h ?? '').trim());
    const headerMatch =
      fileHeader.length >= columns.length && columns.every((expectedHeader, i) => fileHeader[i] === expectedHeader);
    if (!headerMatch) {
      this.analysisErrors.push('Header mismatch. Please download and use the latest template.');
      this.analysisErrors.push(`Expected: ${columns.join(' | ')}`);
      this.analysisErrors.push(`Found: ${fileHeader.join(' | ')}`);
      return;
    }

    this.previewHeaders = [...columns];

    let dataStartIndex = 1;
    while (dataStartIndex < data.length) {
      const rowCells = (data[dataStartIndex] || []).map((c: any) => String(c ?? '').trim().toLowerCase());
      const isRequiredOptionalRow = rowCells.every((c) => c === 'required' || c === 'optional' || c === '');
      const isTypeHintRow = rowCells.every(
        (c) =>
          c === '' ||
          c === 'number' ||
          c === 'string' ||
          c === 'date(yyyy-mm-dd)' ||
          c === 'boolean(true/false)'
      );
      if (isRequiredOptionalRow || isTypeHintRow) {
        dataStartIndex += 1;
      } else {
        break;
      }
    }

    const dataRows = data.slice(dataStartIndex).filter((row) => row?.some((cell) => String(cell ?? '').trim() !== ''));
    if (!dataRows.length) {
      this.analysisErrors.push('No data rows found after header.');
      return;
    }

    let hasErrors = false;

    this.analysisData = dataRows.map((row: any[], index: number) => {
      const rowObj: Record<string, any> = {};
      const rowErrors: string[] = [];
      const filledValues = columns.map((_, i) => row[i] ?? null);

      columns.forEach((col, colIdx) => {
        const raw = row[colIdx];
        const normalized = raw === null || raw === undefined || String(raw).trim() === '' ? null : raw;
        rowObj[col] = normalized;
      });

      required.forEach((col) => {
        if (rowObj[col] === null) rowErrors.push(`Missing ${col}`);
      });

      boolFields.forEach((col) => {
        if (rowObj[col] === null) return;
        const parsed = this.parseBoolean(rowObj[col]);
        if (parsed === null) rowErrors.push(`Invalid boolean in ${col}`);
        rowObj[col] = parsed;
      });

      intFields.forEach((col) => {
        if (rowObj[col] === null) return;
        const parsed = this.parseInteger(rowObj[col]);
        if (parsed === null) rowErrors.push(`Invalid number in ${col}`);
        rowObj[col] = parsed;
      });

      if (rowObj['incidentOccurredAt'] !== null) {
        const parsedDate = this.parseExcelDate(rowObj['incidentOccurredAt']);
        if (!parsedDate) rowErrors.push('Invalid date in incidentOccurredAt');
        rowObj['incidentOccurredAt'] = parsedDate;
      }

      const rowNumber = index + dataStartIndex + 1;
      const error = rowErrors.length ? `Row ${rowNumber}: ${rowErrors.join(', ')}` : null;
      if (error) hasErrors = true;

      this.parsedRows.push(rowObj);
      return { values: filledValues, error };
    });

    if (hasErrors) {
      this.analysisErrors.push('Some rows have validation errors. Please fix and re-upload.');
    } else {
      this.analysisErrors.push(`Analysis complete. ${this.parsedRows.length} row(s) ready to import.`);
    }
  }

  private getTemplateSampleRow(columns: readonly string[], isGbv: boolean): string[] {
    const source = isGbv ? GBV_SAMPLE_VALUES : NGBV_SAMPLE_VALUES;
    return columns.map((col) => source[col] ?? '');
  }

  private getTemplateTypeHint(column: string): string {
    const lower = column.toLowerCase();
    if (lower.includes('occurredat')) return 'date(YYYY-MM-DD)';
    if (
      lower.includes('beneficiary') ||
      lower.includes('known') ||
      lower.includes('associated') ||
      lower.includes('consent')
    ) {
      return 'boolean(true/false)';
    }
    if (lower.includes('id') || lower.includes('age') || lower.includes('gender')) {
      return 'number';
    }
    return 'string';
  }

  private applyHeaderStyle(ws: XLSX.WorkSheet, columnCount: number): void {
    for (let colIndex = 0; colIndex < columnCount; colIndex += 1) {
      const cellRef = XLSX.utils.encode_cell({ c: colIndex, r: 0 });
      const cell = ws[cellRef] as any;
      if (!cell) continue;
      cell.s = {
        fill: { patternType: 'solid', fgColor: { rgb: '22C55E' } },
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      };
    }
  }

  private parseExcelDate(value: any): string | null {
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return this.formatDate(date);
    }
    const str = String(value).trim();
    if (!str) return null;
    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) return null;
    return this.formatDate(parsed);
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private parseBoolean(value: any): boolean | null {
    const text = String(value).trim().toLowerCase();
    if (['true', '1', 'yes'].includes(text)) return true;
    if (['false', '0', 'no'].includes(text)) return false;
    return null;
  }

  private parseInteger(value: any): number | null {
    const n = parseInt(String(value).trim(), 10);
    return Number.isNaN(n) ? null : n;
  }

  private compactRow(row: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    Object.entries(row).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        clean[key] = value;
      }
    });
    return clean;
  }
}
