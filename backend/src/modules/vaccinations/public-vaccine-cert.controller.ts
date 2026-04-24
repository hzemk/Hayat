import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '@common/decorators/public.decorator';
import { PrismaService } from '@prisma-db/prisma.service';
import { VaccineCertShareService } from './vaccine-cert-share.service';

// Public HTML vaccination certificate that the mobile QR code points to.
// Anyone with a valid short-lived token URL can view it (e.g. airport
// health desk, clinic reception). No auth required.
@Controller('v')
export class PublicVaccineCertController {
  constructor(
    private readonly share: VaccineCertShareService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get(':token')
  async view(@Param('token') token: string, @Res() res: Response) {
    res.setHeader('Cache-Control', 'no-store');

    let vaccinationId: string;
    try {
      ({ vaccinationId } = await this.share.verify(token));
    } catch {
      res.status(410).type('html').send(renderErrorPage('Link expired'));
      return;
    }

    const vx = await this.prisma.vaccination.findUnique({
      where: { id: vaccinationId },
      include: {
        user: {
          select: { fullName: true, dateOfBirth: true, gender: true },
        },
        administeredByDoctor: {
          include: {
            user: { select: { fullName: true } },
          },
        },
        administeredAtHospital: {
          select: { nameEn: true, nameAr: true, city: true, phone: true },
        },
      },
    });

    if (!vx) {
      res.status(404).type('html').send(renderErrorPage('Certificate not found'));
      return;
    }

    res.type('html').send(renderCertPage(vx));
  }
}

type VaccineRow = {
  name: string;
  manufacturer: string | null;
  doseNumber: number | null;
  totalDoses: number | null;
  dateGiven: Date;
  expiresAt: Date | null;
  batchNumber: string | null;
  administeredBy: string | null;
  administeredAt: string | null;
  certificateNumber: string | null;
  notes: string | null;
  user: { fullName: string | null; dateOfBirth: Date | null; gender: string | null };
  administeredByDoctor: {
    specialty: string;
    user: { fullName: string | null };
  } | null;
  administeredAtHospital: {
    nameEn: string;
    nameAr: string;
    city: string;
    phone: string | null;
  } | null;
};

function renderCertPage(vx: VaccineRow): string {
  const holder = esc(vx.user.fullName ?? '—');
  const vaccine = esc(vx.name);
  const manufacturer = vx.manufacturer ? esc(vx.manufacturer) : null;
  const dose =
    vx.doseNumber && vx.totalDoses
      ? `Dose ${vx.doseNumber} of ${vx.totalDoses}`
      : vx.doseNumber
        ? `Dose ${vx.doseNumber}`
        : null;
  const dateGiven = formatDate(vx.dateGiven);
  const expires = vx.expiresAt ? formatDate(vx.expiresAt) : null;
  const expired = vx.expiresAt
    ? vx.expiresAt.getTime() < Date.now()
    : false;
  const batch = vx.batchNumber ? esc(vx.batchNumber) : null;
  const cert = vx.certificateNumber ? esc(vx.certificateNumber) : null;
  const dob = vx.user.dateOfBirth ? formatDate(vx.user.dateOfBirth) : null;
  const gender = vx.user.gender
    ? vx.user.gender.charAt(0) + vx.user.gender.slice(1).toLowerCase()
    : null;

  const doctorName =
    vx.administeredByDoctor?.user.fullName ?? vx.administeredBy ?? null;
  const doctorSpecialty = vx.administeredByDoctor?.specialty ?? null;
  const hospitalName =
    vx.administeredAtHospital?.nameEn ?? vx.administeredAt ?? null;
  const hospitalCity = vx.administeredAtHospital?.city ?? null;
  const hospitalPhone = vx.administeredAtHospital?.phone ?? null;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Hayat Vaccination Certificate — ${holder}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #f4f6fb;
    color: #111827;
    -webkit-font-smoothing: antialiased;
  }
  .hero {
    background: linear-gradient(135deg, #0f766e, #0d9488);
    color: #fff;
    padding: 28px 20px 32px;
    text-align: center;
  }
  .brand { opacity: 0.85; font-size: 12px; letter-spacing: 1.6px; text-transform: uppercase; }
  .hero h1 { margin: 8px 0 4px; font-size: 24px; font-weight: 700; }
  .hero .subtitle { opacity: 0.9; font-size: 14px; }
  .badge-row {
    margin-top: 10px; display: inline-flex; gap: 6px; flex-wrap: wrap; justify-content: center;
  }
  .badge {
    font-size: 11px; padding: 4px 10px; border-radius: 999px;
    background: rgba(255,255,255,0.18); color: #fff; font-weight: 600; letter-spacing: 0.4px;
  }
  .shield-icon {
    width: 56px; height: 56px; border-radius: 16px;
    background: rgba(255,255,255,0.18);
    display: inline-flex; align-items: center; justify-content: center;
    margin-bottom: 6px; font-size: 28px;
  }
  .container { max-width: 640px; margin: 0 auto; padding: 16px; }
  .card {
    background: #fff;
    border-radius: 14px;
    padding: 16px;
    margin-bottom: 14px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
  }
  .expired {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 12px 16px;
    border-radius: 12px;
    margin-bottom: 14px;
    font-weight: 600;
    display: flex; align-items: center; gap: 10px;
  }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 1.2px; color: #6b7280; margin: 0 0 10px; font-weight: 700; }
  .kv { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  .kv:last-child { border-bottom: none; }
  .kv .label { color: #6b7280; }
  .kv .value { color: #111827; font-weight: 600; text-align: right; max-width: 65%; }
  .footer { text-align: center; color: #9ca3af; font-size: 12px; padding: 16px 0 28px; }
  @media print {
    body { background: #fff; }
    .hero { color: #0f766e; background: #fff; border-bottom: 2px solid #0d9488; }
    .brand, .hero h1, .hero .subtitle, .badge { color: #0f766e; }
    .badge { background: #ccfbf1; }
    .shield-icon { background: #ccfbf1; }
    .card { box-shadow: none; border: 1px solid #e5e7eb; }
  }
</style>
</head>
<body>
  <div class="hero">
    <div class="shield-icon">💉</div>
    <div class="brand">Hayat · Vaccination Certificate</div>
    <h1>${holder}</h1>
    <div class="subtitle">${vaccine}${manufacturer ? ` · ${manufacturer}` : ''}</div>
    <div class="badge-row">
      ${dose ? `<span class="badge">${esc(dose)}</span>` : ''}
      ${expired ? `<span class="badge" style="background:#fecaca;color:#991b1b;">Expired</span>` : expires ? `<span class="badge">Valid</span>` : ''}
    </div>
  </div>

  <div class="container">
    ${expired ? `<div class="expired"><span>⚠️</span><span>This certificate has expired on ${esc(expires!)}.</span></div>` : ''}

    <div class="card">
      <h2>Holder</h2>
      <div class="kv"><span class="label">Full name</span><span class="value">${holder}</span></div>
      ${dob ? `<div class="kv"><span class="label">Date of birth</span><span class="value">${esc(dob)}</span></div>` : ''}
      ${gender ? `<div class="kv"><span class="label">Gender</span><span class="value">${esc(gender)}</span></div>` : ''}
    </div>

    <div class="card">
      <h2>Vaccination</h2>
      <div class="kv"><span class="label">Vaccine</span><span class="value">${vaccine}</span></div>
      ${manufacturer ? `<div class="kv"><span class="label">Manufacturer</span><span class="value">${manufacturer}</span></div>` : ''}
      ${dose ? `<div class="kv"><span class="label">Dose</span><span class="value">${esc(dose)}</span></div>` : ''}
      <div class="kv"><span class="label">Date given</span><span class="value">${esc(dateGiven)}</span></div>
      ${expires ? `<div class="kv"><span class="label">Valid until</span><span class="value">${esc(expires)}</span></div>` : ''}
      ${batch ? `<div class="kv"><span class="label">Batch / lot</span><span class="value">${batch}</span></div>` : ''}
      ${cert ? `<div class="kv"><span class="label">Certificate #</span><span class="value">${cert}</span></div>` : ''}
    </div>

    ${
      doctorName || hospitalName
        ? `<div class="card">
            <h2>Administered by</h2>
            ${doctorName ? `<div class="kv"><span class="label">Doctor</span><span class="value">${esc(doctorName)}${doctorSpecialty ? ` · ${esc(doctorSpecialty)}` : ''}</span></div>` : ''}
            ${hospitalName ? `<div class="kv"><span class="label">Hospital</span><span class="value">${esc(hospitalName)}${hospitalCity ? `, ${esc(hospitalCity)}` : ''}</span></div>` : ''}
            ${hospitalPhone ? `<div class="kv"><span class="label">Phone</span><span class="value">${esc(hospitalPhone)}</span></div>` : ''}
          </div>`
        : ''
    }

    ${
      vx.notes
        ? `<div class="card"><h2>Notes</h2><div style="font-size:14px;color:#374151;">${esc(vx.notes)}</div></div>`
        : ''
    }

    <div class="footer">Shared securely via Hayat · Link expires in 24h</div>
  </div>
</body>
</html>`;
}

function renderErrorPage(message: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hayat Vaccination Certificate</title>
<style>
  body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background:#f4f6fb; color:#111827; display:flex; min-height:100vh; align-items:center; justify-content:center; padding:24px; }
  .box { background:#fff; border-radius:14px; padding:28px; max-width:360px; text-align:center; box-shadow:0 2px 8px rgba(15,23,42,0.06); }
  h1 { margin:0 0 8px; font-size:20px; color:#991b1b; }
  p { margin:0; color:#6b7280; font-size:14px; }
  .icon { font-size:36px; margin-bottom:8px; }
</style>
</head>
<body>
  <div class="box">
    <div class="icon">⛔</div>
    <h1>${esc(message)}</h1>
    <p>Ask the cardholder to reopen this vaccination in the Hayat app to generate a fresh code.</p>
  </div>
</body>
</html>`;
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
