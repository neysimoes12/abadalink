// Push notification utilities
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

export function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered:', registration);
        return registration;
    } catch (error) {
        console.error('SW registration failed:', error);
        return null;
    }
}

export async function subscribeToPush(registration) {
    if (!('PushManager' in window)) {
        console.warn('Push not supported');
        return null;
    }

    try {
        // Check current subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // Subscribe user
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            console.log('Push subscription created:', subscription);
        }

        return subscription;
    } catch (error) {
        console.error('Push subscription failed:', error);
        return null;
    }
}

export async function sendSubscriptionToServer(subscription, token) {
    try {
        const response = await fetch('http://localhost:8000/push/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(subscription)
        });
        return response.ok;
    } catch (error) {
        console.error('Failed to send subscription to server:', error);
        return false;
    }
}

export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('Notifications not supported');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission;
    }

    return Notification.permission;
}

// Main function to setup push notifications
export async function setupPushNotifications(token) {
    const permission = await requestNotificationPermission();

    if (permission !== 'granted') {
        console.log('Notification permission denied');
        return false;
    }

    const registration = await registerServiceWorker();
    if (!registration) return false;

    const subscription = await subscribeToPush(registration);
    if (!subscription) return false;

    const success = await sendSubscriptionToServer(subscription, token);
    return success;
}
