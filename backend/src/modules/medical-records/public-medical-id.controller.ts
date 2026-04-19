import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Gender } from '@prisma/client';
import { Public } from '@common/decorators/public.decorator';
import { PrismaService } from '@prisma-db/prisma.service';
import { MedicalIdShareService } from './medical-id-share.service';
import { MedicalRecordsService } from './medical-records.service';

type UserInfo = {
  fullName: string | null;
  phoneNumber: string | null;
  dateOfBirth: Date | null;
  gender: Gender | null;
};

type RecordInfo = Awaited<ReturnType<MedicalRecordsService['getForUser']>>;

const HIGH_SEVERITY = ['severe', 'critical', 'anaphylaxis', 'life-threatening'];
const MEDIUM_SEVERITY = ['moderate', 'medium'];

@Controller('m')
export class PublicMedicalIdController {
  constructor(
    private readonly share: MedicalIdShareService,
    private readonly records: MedicalRecordsService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get(':token')
  async view(@Param('token') token: string, @Res() res: Response) {
    res.setHeader('Cache-Control', 'no-store');

    let userId: string;
    try {
      ({ userId } = await this.share.verify(token));
    } catch {
      res.status(410).type('html').send(renderErrorPage('Link expired'));
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        phoneNumber: true,
        dateOfBirth: true,
        gender: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      res.status(404).type('html').send(renderErrorPage('Record not available'));
      return;
    }

    const record = await this.records.getForUser(userId);
    res.type('html').send(renderIdPage(user, record));
  }
}

function renderIdPage(user: UserInfo, record: RecordInfo): string {
  const name = esc(user.fullName ?? '—');
  const age = calcAge(user.dateOfBirth);
  const gender = user.gender ? titleCase(user.gender) : null;
  const dobLine = user.dateOfBirth
    ? user.dateOfBirth.toISOString().slice(0, 10)
    : '—';
  const phone = user.phoneNumber ?? '—';

  const subtitleParts = [
    age !== null ? `${age} yrs` : null,
    gender,
    record.bloodType ? `${record.bloodType} blood` : null,
  ].filter(Boolean) as string[];
  const subtitle = subtitleParts.length ? subtitleParts.join(' · ') : '—';

  const hasCritical = record.allergies.some(
    (a) => classifySeverity(a.severity) === 'high',
  );

  const allergiesHtml = record.allergies.length
    ? record.allergies
        .map((a) => {
          const sev = classifySeverity(a.severity);
          const sevLabel = a.severity ? esc(a.severity) : null;
          const reaction = a.reaction ? esc(a.reaction) : null;
          return `<li class="item"><div class="item-head"><span class="item-title">${esc(
            a.substance,
          )}</span>${
            sevLabel
              ? `<span class="pill pill-${sev}">${sevLabel}</span>`
              : ''
          }</div>${reaction ? `<div class="item-sub">Reaction: ${reaction}</div>` : ''}</li>`;
        })
        .join('')
    : '<li class="empty">No known allergies</li>';

  const conditionsHtml = record.conditions.length
    ? record.conditions
        .map((c) => {
          const status = c.status ? esc(c.status) : null;
          const notes = c.notes ? esc(c.notes) : null;
          return `<li class="item"><div class="item-head"><span class="item-title">${esc(
            c.name,
          )}</span>${status ? `<span class="pill pill-muted">${status}</span>` : ''}</div>${
            notes ? `<div class="item-sub">${notes}</div>` : ''
          }</li>`;
        })
        .join('')
    : '<li class="empty">None reported</li>';

  const medsHtml = record.medications.length
    ? record.medications
        .map((m) => {
          const meta = [m.dose, m.frequency]
            .filter((v): v is string => Boolean(v))
            .map(esc)
            .join(' · ');
          const notes = m.notes ? esc(m.notes) : null;
          return `<li class="item"><div class="item-title">${esc(
            m.name,
          )}</div>${meta ? `<div class="item-sub">${meta}</div>` : ''}${
            notes ? `<div class="item-sub-muted">${notes}</div>` : ''
          }</li>`;
        })
        .join('')
    : '<li class="empty">None reported</li>';

  const contactsHtml = record.emergencyContacts.length
    ? record.emergencyContacts
        .map(
          (c) =>
            `<li class="item"><div class="item-title">${esc(c.name)}</div><div class="item-sub">${esc(
              c.relationship,
            )}</div><a class="call-btn" href="tel:${esc(
              c.phoneNumber,
            )}">📞 ${esc(c.phoneNumber)}</a></li>`,
        )
        .join('')
    : '<li class="empty">No emergency contacts</li>';

  const heightLabel = record.heightCm ? `${record.heightCm} cm` : '—';
  const weightLabel = record.weightKg ? `${record.weightKg} kg` : '—';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Hayat Emergency Medical ID — ${name}</title>
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
  .hero h1 { margin: 8px 0 4px; font-size: 26px; font-weight: 700; }
  .hero .subtitle { opacity: 0.9; font-size: 14px; }
  .emergency-icon {
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
  .critical {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 12px 16px;
    border-radius: 12px;
    margin-bottom: 14px;
    font-weight: 600;
    display: flex; align-items: center; gap: 10px;
  }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin: 0 0 10px; font-weight: 700; }
  .kv { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  .kv:last-child { border-bottom: none; }
  .kv .label { color: #6b7280; }
  .kv .value { color: #111827; font-weight: 600; }
  .vitals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
  .vital { background: #f8fafc; border-radius: 10px; padding: 10px; text-align: center; }
  .vital .v { font-weight: 700; font-size: 16px; }
  .vital .l { font-size: 11px; color: #6b7280; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.6px; }
  ul { list-style: none; margin: 0; padding: 0; }
  .item { padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
  .item:last-child { border-bottom: none; }
  .item-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .item-title { font-weight: 600; font-size: 15px; }
  .item-sub { color: #4b5563; font-size: 13px; margin-top: 2px; }
  .item-sub-muted { color: #9ca3af; font-size: 12px; margin-top: 2px; }
  .pill { font-size: 11px; padding: 3px 8px; border-radius: 999px; font-weight: 600; text-transform: capitalize; }
  .pill-high { background: #fee2e2; color: #991b1b; }
  .pill-medium { background: #fef3c7; color: #92400e; }
  .pill-low { background: #dcfce7; color: #166534; }
  .pill-unknown { background: #f1f5f9; color: #475569; }
  .pill-muted { background: #f1f5f9; color: #475569; }
  .empty { color: #9ca3af; font-size: 14px; padding: 8px 0; }
  .call-btn {
    display: inline-block; margin-top: 8px;
    background: #0d9488; color: #fff; font-weight: 600;
    padding: 8px 14px; border-radius: 10px; text-decoration: none; font-size: 14px;
  }
  .footer { text-align: center; color: #9ca3af; font-size: 12px; padding: 16px 0 28px; }
</style>
</head>
<body>
  <div class="hero">
    <div class="emergency-icon">⚕️</div>
    <div class="brand">Hayat · Emergency Medical ID</div>
    <h1>${name}</h1>
    <div class="subtitle">${esc(subtitle)}</div>
  </div>

  <div class="container">
    ${hasCritical ? `<div class="critical"><span>⚠️</span><span>Critical allergy on file — review before treatment.</span></div>` : ''}

    <div class="card">
      <h2>Identity</h2>
      <div class="kv"><span class="label">Phone</span><span class="value">${esc(phone)}</span></div>
      <div class="kv"><span class="label">Date of birth</span><span class="value">${esc(dobLine)}</span></div>
      ${gender ? `<div class="kv"><span class="label">Gender</span><span class="value">${esc(gender)}</span></div>` : ''}
      <div class="vitals">
        <div class="vital"><div class="v">${esc(record.bloodType ?? '—')}</div><div class="l">Blood</div></div>
        <div class="vital"><div class="v">${esc(heightLabel)}</div><div class="l">Height</div></div>
        <div class="vital"><div class="v">${esc(weightLabel)}</div><div class="l">Weight</div></div>
      </div>
    </div>

    <div class="card">
      <h2>Allergies</h2>
      <ul>${allergiesHtml}</ul>
    </div>

    <div class="card">
      <h2>Conditions</h2>
      <ul>${conditionsHtml}</ul>
    </div>

    <div class="card">
      <h2>Current medications</h2>
      <ul>${medsHtml}</ul>
    </div>

    <div class="card">
      <h2>Emergency contacts</h2>
      <ul>${contactsHtml}</ul>
    </div>

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
<title>Hayat Emergency Medical ID</title>
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
    <p>Ask the cardholder to reopen their Emergency ID in the Hayat app to generate a fresh code.</p>
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

function calcAge(dob: Date | null): number | null {
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function classifySeverity(
  raw: string | null | undefined,
): 'high' | 'medium' | 'low' | 'unknown' {
  if (!raw) return 'unknown';
  const v = raw.toLowerCase();
  if (HIGH_SEVERITY.some((s) => v.includes(s))) return 'high';
  if (MEDIUM_SEVERITY.some((s) => v.includes(s))) return 'medium';
  if (v.includes('mild') || v.includes('low')) return 'low';
  return 'unknown';
}
