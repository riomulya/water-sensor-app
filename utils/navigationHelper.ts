import { router } from 'expo-router';

/**
 * This helper provides navigation functions with the correct path format
 * for the application's route structure.
 */

// Go to the locations list
export const goToLocations = () => {
    try {
        // @ts-ignore - Ignoring TypeScript errors for navigation paths
        router.push('locations');
    } catch (error) {
        console.error('Navigation error:', error);
    }
};

// Go to add location screen
export const goToAddLocation = () => {
    try {
        // @ts-ignore - Ignoring TypeScript errors for navigation paths
        router.push('locations/add');
    } catch (error) {
        console.error('Navigation error:', error);
    }
};

// Go to edit location screen
export const goToEditLocation = (id: number | string) => {
    try {
        router.push({
            // @ts-ignore - Ignoring TypeScript errors for navigation paths
            pathname: 'locations/[id]',
            params: { id: id.toString() }
        });
    } catch (error) {
        console.error('Navigation error:', error);
    }
};

// Go back to previous screen
export const goBack = () => {
    try {
        router.back();
    } catch (error) {
        console.error('Navigation error:', error);
    }
}; 