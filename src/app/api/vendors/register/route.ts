import { NextRequest, NextResponse } from 'next/server';
import { registerVendor, VendorRegistrationData } from '@/lib/vendors/vendor-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['userId', 'businessName', 'email'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate business name length
    if (body.businessName.length < 2 || body.businessName.length > 255) {
      return NextResponse.json(
        { error: 'Business name must be between 2 and 255 characters' },
        { status: 400 }
      );
    }

    const registrationData: VendorRegistrationData = {
      userId: body.userId,
      businessName: body.businessName,
      email: body.email,
      description: body.description,
      phone: body.phone,
      address: body.address,
      city: body.city,
      state: body.state,
      country: body.country,
      postalCode: body.postalCode,
    };

    const result = await registerVendor(registrationData);

    // In a real implementation, we would save the vendor to the database here
    // For now, we return the created vendor data and onboarding URL

    return NextResponse.json({
      success: true,
      vendor: {
        ...result.vendor,
        // Don't expose internal IDs in response
        stripeAccountId: undefined,
      },
      onboardingUrl: result.stripeOnboardingUrl,
      message: 'Vendor registration initiated. Please complete Stripe onboarding.',
    }, { status: 201 });

  } catch (error) {
    console.error('Vendor registration error:', error);
    
    if (error instanceof Error) {
      // Handle specific Stripe errors
      if (error.message.includes('Stripe')) {
        return NextResponse.json(
          { error: 'Payment setup failed. Please try again.' },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to register vendor. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}