import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Clinic } from '@/lib/dataTypes';

/**
 * GET /api/clinics
 * Fetches all clinics from the data directory
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const city = searchParams.get('city');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');

    // Read clinic data from JSON files in the data directory
    const dataDir = path.join(process.cwd(), 'data', 'clinics');
    
    let allClinics: Clinic[] = [];

    try {
      // Check if data directory exists
      await fs.access(dataDir);
      
      // Read all JSON files in the directory
      const files = await fs.readdir(dataDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      for (const file of jsonFiles) {
        const filePath = path.join(dataDir, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const clinics = JSON.parse(fileContent);
        
        if (Array.isArray(clinics)) {
          allClinics = [...allClinics, ...clinics];
        } else if (clinics.clinics && Array.isArray(clinics.clinics)) {
          allClinics = [...allClinics, ...clinics.clinics];
        }
      }
    } catch (error) {
      console.error('Error reading clinic data:', error);
      // Return empty array if no data exists yet
      return NextResponse.json({
        clinics: [],
        total: 0,
        page: 1,
        per_page: perPage,
        message: 'No clinic data available yet. Please run data collection scripts.',
      });
    }

    // Filter by state if provided
    if (state) {
      allClinics = allClinics.filter(clinic => 
        clinic.formatted_address.toLowerCase().includes(state.toLowerCase())
      );
    }

    // Filter by city if provided
    if (city) {
      allClinics = allClinics.filter(clinic =>
        clinic.formatted_address.toLowerCase().includes(city.toLowerCase())
      );
    }

    // Pagination
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedClinics = allClinics.slice(startIndex, endIndex);

    return NextResponse.json({
      clinics: paginatedClinics,
      total: allClinics.length,
      page,
      per_page: perPage,
    });
  } catch (error) {
    console.error('Error in clinics API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clinics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clinics
 * Adds new clinics to the data directory
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clinics, state } = body;

    if (!clinics || !Array.isArray(clinics)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { clinics: Clinic[], state?: string }' },
        { status: 400 }
      );
    }

    const dataDir = path.join(process.cwd(), 'data', 'clinics');
    
    // Ensure data directory exists
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    // Save to a JSON file (organized by state if provided)
    const fileName = state 
      ? `${state.toLowerCase().replace(/\s+/g, '-')}.json`
      : `clinics-${Date.now()}.json`;
    
    const filePath = path.join(dataDir, fileName);

    // Check if file exists and merge with existing data
    let existingClinics: Clinic[] = [];
    try {
      const existingContent = await fs.readFile(filePath, 'utf-8');
      const existingData = JSON.parse(existingContent);
      existingClinics = Array.isArray(existingData) ? existingData : existingData.clinics || [];
    } catch {
      // File doesn't exist, that's okay
    }

    // Merge new clinics with existing ones (avoid duplicates by place_id)
    const clinicMap = new Map<string, Clinic>();
    
    existingClinics.forEach(clinic => {
      clinicMap.set(clinic.place_id, clinic);
    });
    
    clinics.forEach((clinic: Clinic) => {
      clinicMap.set(clinic.place_id, clinic);
    });

    const mergedClinics = Array.from(clinicMap.values());

    // Write to file
    await fs.writeFile(
      filePath,
      JSON.stringify({ clinics: mergedClinics, last_updated: new Date().toISOString() }, null, 2)
    );

    return NextResponse.json({
      success: true,
      added: clinics.length,
      total: mergedClinics.length,
      file: fileName,
    });
  } catch (error) {
    console.error('Error in clinics POST:', error);
    return NextResponse.json(
      { error: 'Failed to save clinics' },
      { status: 500 }
    );
  }
}
