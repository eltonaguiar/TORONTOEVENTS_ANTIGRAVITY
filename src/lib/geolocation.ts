/**
 * Calculate the distance between two geographic coordinates using the Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
}

function toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Geocode a Canadian postal code to latitude/longitude
 * Uses a free geocoding service
 */
export async function geocodePostalCode(postalCode: string): Promise<{ lat: number; lng: number } | null> {
    try {
        // Clean postal code (remove spaces, uppercase)
        const cleaned = postalCode.replace(/\s/g, '').toUpperCase();

        // Validate Canadian postal code format
        if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cleaned)) {
            throw new Error('Invalid Canadian postal code format');
        }

        // Use Nominatim (OpenStreetMap) geocoding service
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?postalcode=${cleaned}&country=Canada&format=json&limit=1`,
            {
                headers: {
                    'User-Agent': 'TorontoEventsApp/1.0'
                }
            }
        );

        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }

        return null;
    } catch (error) {
        console.error('Error geocoding postal code:', error);
        return null;
    }
}

/**
 * Geocode an address to latitude/longitude
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
        // Add Toronto, ON if not already specified
        const fullAddress = address.toLowerCase().includes('toronto')
            ? address
            : `${address}, Toronto, ON, Canada`;

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1`,
            {
                headers: {
                    'User-Agent': 'TorontoEventsApp/1.0'
                }
            }
        );

        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }

        return null;
    } catch (error) {
        console.error('Error geocoding address:', error);
        return null;
    }
}

/**
 * Get user's current location using browser geolocation API
 */
export function getBrowserLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000 // Cache for 5 minutes
            }
        );
    });
}
