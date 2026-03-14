import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const VIEWS_FILE = path.join(process.cwd(), 'data', 'views.json');

function getViews() {
  try {
    if (!fs.existsSync(path.dirname(VIEWS_FILE))) {
      fs.mkdirSync(path.dirname(VIEWS_FILE), { recursive: true });
    }
    if (!fs.existsSync(VIEWS_FILE)) {
      fs.writeFileSync(VIEWS_FILE, JSON.stringify({ total: 0 }));
    }
    const data = fs.readFileSync(VIEWS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { total: 0 };
  }
}

function saveViews(data: { total: number }) {
  fs.writeFileSync(VIEWS_FILE, JSON.stringify(data));
}

export async function GET() {
  const views = getViews();
  return NextResponse.json(views);
}

export async function POST() {
  const views = getViews();
  views.total += 1;
  saveViews(views);
  return NextResponse.json(views);
}
