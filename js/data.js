// =====================================================
// data.js — ES Module: All community data
// Demonstrates: arrays, objects, export
// =====================================================

// Array of pet objects
export const pets = [
  {
    id: 1,
    name: 'Max',
    type: 'Dog',
    breed: 'Golden Retriever',
    owner: 'Maria Santos',
    age: 3,
    emoji: '🐕',
    likes: 128,
    followers: 245,
    bio: 'Eats shoes for fun. Currently on his 3rd pair of victims.',
    color: '#FEF3C7'
  },
  {
    id: 2,
    name: 'Luna',
    type: 'Cat',
    breed: 'Persian Cat',
    owner: 'Juan dela Cruz',
    age: 2,
    emoji: '🐈',
    likes: 200,
    followers: 380,
    bio: 'Gets mad if you eat before feeding her first. Very serious about this.',
    color: '#F3E8FF'
  },
  {
    id: 3,
    name: 'Coco',
    type: 'Bird',
    breed: 'Cockatiel',
    owner: 'Anne Reyes',
    age: 1,
    emoji: '🦜',
    likes: 95,
    followers: 170,
    bio: 'Knows how to whistle two songs. His mom cried the first time she heard it.',
    color: '#D1FAE5'
  },
  {
    id: 4,
    name: 'Buddy',
    type: 'Dog',
    breed: 'Labrador',
    owner: 'Carlo Mendoza',
    age: 5,
    emoji: '🐶',
    likes: 310,
    followers: 520,
    bio: 'Sleeps 14 hours a day and still looks tired. A mood.',
    color: '#FEE2E2'
  },
  {
    id: 5,
    name: 'Mochi',
    type: 'Cat',
    breed: 'Scottish Fold',
    owner: 'Kim Flores',
    age: 2,
    emoji: '😸',
    likes: 175,
    followers: 290,
    bio: "Doesn't want to be held but also doesn't want to be ignored. Classic cat.",
    color: '#E0E7FF'
  },
  {
    id: 6,
    name: 'Thumper',
    type: 'Rabbit',
    breed: 'Holland Lop',
    owner: 'Nina Garcia',
    age: 1,
    emoji: '🐇',
    likes: 140,
    followers: 210,
    bio: 'Has chewed through 4 phone chargers. No remorse whatsoever.',
    color: '#FCE7F3'
  }
];

// Array of post objects
export const posts = [
  {
    id: 1,
    author: 'Maria Santos',
    petName: 'Max',
    petEmoji: '🐕',
    content: 'Caught Max eating the TV remote again. I asked him why. He just looked at me and walked away. No guilt at all. 😭',
    likes: 87,
    comments: 23,
    time: '2 hours ago',
    tags: ['dogs', 'naughty', 'stilllovehim']
  },
  {
    id: 2,
    author: 'Juan dela Cruz',
    petName: 'Luna',
    petEmoji: '🐈',
    content: 'My mom called and I said I was busy. I was — Luna was on my lap and gets mad if I stop petting her. Priorities.',
    likes: 134,
    comments: 41,
    time: '5 hours ago',
    tags: ['cats', 'catmom', 'noregrets']
  },
  {
    id: 3,
    author: 'Carlo Mendoza',
    petName: 'Buddy',
    petEmoji: '🐶',
    content: 'Spent my shoe budget on a new harness for Buddy. Zero regrets. He needed it more than I did anyway.',
    likes: 210,
    comments: 58,
    time: 'yesterday',
    tags: ['dogdad', 'noregrets', 'labrador']
  },
  {
    id: 4,
    author: 'Anne Reyes',
    petName: 'Coco',
    petEmoji: '🦜',
    content: 'Coco has been saying "I love you" all morning. I have no idea who taught him but honestly I needed to hear that today. 🥲',
    likes: 96,
    comments: 29,
    time: '2 days ago',
    tags: ['birds', 'coco', 'surprise']
  }
];

// Array of event objects
export const events = [
  {
    id: 1,
    title: 'PetVerse Pawfest 2025',
    desc: 'Our biggest meetup yet! Bring your pets, hang out with other fur parents, and enjoy a day full of pet-friendly activities.',
    date: 'June 22, 2025',
    location: 'Ayala Triangle Gardens, Makati',
    emoji: '🎉',
    color: 'linear-gradient(135deg, #7C3AED, #EC4899)',
    attendees: 230
  },
  {
    id: 2,
    title: 'Libreng Bakuna para sa Pets',
    desc: 'Our partner vets are offering free rabies and multi-vaccines for dogs and cats. Bring your pet record if you have one.',
    date: 'June 28, 2025',
    location: 'Quezon Memorial Circle, QC',
    emoji: '💉',
    color: 'linear-gradient(135deg, #10B981, #3B82F6)',
    attendees: 180
  },
  {
    id: 3,
    title: 'Pinaka-Gwapong Pet Contest',
    desc: 'Show off your fur baby! Submit a photo and the community votes for the winner. Prizes for the top 3!',
    date: 'July 5, 2025',
    location: 'Online — right here on PetVerse',
    emoji: '📸',
    color: 'linear-gradient(135deg, #F59E0B, #EF4444)',
    attendees: 540
  }
];

// Community stats object
export const stats = {
  members: '12,400+',
  pets:    '8,900+',
  posts:   '54,000+',
  events:  '320+'
};
