/**
 * Image handling utilities
 * Provides fallback images and image optimization
 */

/**
 * Default event image (placeholder)
 * You can replace this with an actual image URL or data URI
 */
const DEFAULT_EVENT_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFhMWIxZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5FdmVudCBJbWFnZTwvdGV4dD48L3N2Zz4=';

/**
 * Get event image with fallback
 */
export function getEventImage(eventImage?: string | null, eventTitle?: string): string {
    if (eventImage && eventImage.trim() && !isPlaceholderImage(eventImage)) {
        return eventImage;
    }
    
    return DEFAULT_EVENT_IMAGE;
}

/**
 * Check if image is a placeholder or invalid
 */
export function isPlaceholderImage(imageUrl: string | null | undefined): boolean {
    if (!imageUrl) return true;
    
    const url = imageUrl.toLowerCase();
    
    // Common placeholder patterns
    const placeholderPatterns = [
        'placeholder',
        'no-image',
        'default',
        'missing',
        'null',
        'undefined',
        '1x1',
        'blank',
        'transparent'
    ];
    
    return placeholderPatterns.some(pattern => url.includes(pattern));
}

/**
 * Get optimized image URL (for future CDN integration)
 */
export function getOptimizedImageUrl(imageUrl: string, width?: number, height?: number): string {
    // For now, return original URL
    // In future, can integrate with image CDN (e.g., Cloudinary, Imgix)
    return imageUrl;
}

/**
 * Check if image URL is valid
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    
    try {
        const urlObj = new URL(url);
        // Check if it's a valid image extension or data URI
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const isDataUri = url.startsWith('data:image');
        const hasImageExt = imageExtensions.some(ext => urlObj.pathname.toLowerCase().endsWith(ext));
        
        return isDataUri || hasImageExt;
    } catch {
        return false;
    }
}
