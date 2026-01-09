export interface Volunteer {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    status: 'available' | 'busy';
    rating: number;
    distance?: number;
}

export interface Contact {
    id: string;
    name: string;
    phone: string;
    relation: string;
}

export const MOCK_VOLUNTEERS: Volunteer[] = [
    {
        id: '1',
        name: 'John Doe',
        latitude: 37.78825,
        longitude: -122.4324,
        status: 'available',
        rating: 4.8,
    },
    {
        id: '2',
        name: 'Jane Smith',
        latitude: 37.78925,
        longitude: -122.4344,
        status: 'available',
        rating: 4.9,
    },
    {
        id: '3',
        name: 'Mike Johnson',
        latitude: 37.78725,
        longitude: -122.4304,
        status: 'busy',
        rating: 4.5,
    },
];

export const MOCK_CONTACTS: Contact[] = [
    {
        id: '1',
        name: 'Mom',
        phone: '123-456-7890',
        relation: 'Parent',
    },
    {
        id: '2',
        name: 'Dad',
        phone: '098-765-4321',
        relation: 'Parent',
    },
    {
        id: '3',
        name: 'Sarah (Sister)',
        phone: '555-123-4567',
        relation: 'Sibling',
    },
];
