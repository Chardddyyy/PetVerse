-- =====================================================
-- PetVerse Database — Schema + Seed Data
-- Run: mysql -u root -p < database.sql
-- =====================================================

CREATE DATABASE IF NOT EXISTS petverse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE petverse;

-- =====================================================
-- TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS members (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  facebook_id   VARCHAR(100) DEFAULT NULL,
  google_id     VARCHAR(100) DEFAULT NULL,
  pet_name      VARCHAR(100) NOT NULL,
  pet_type      ENUM('dog','cat','rabbit','bird','other') NOT NULL,
  joined_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pets (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  type       VARCHAR(50)  NOT NULL,
  breed      VARCHAR(100),
  owner      VARCHAR(100),
  age        INT          DEFAULT 1,
  emoji      VARCHAR(20)  DEFAULT '🐾',
  likes      INT          DEFAULT 0,
  followers  INT          DEFAULT 0,
  bio        TEXT,
  color      VARCHAR(50)  DEFAULT '#F3F4F6'
);

CREATE TABLE IF NOT EXISTS pet_follows (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  pet_id      INT         NOT NULL,
  session_id  VARCHAR(64) NOT NULL,
  created_at  DATETIME    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pet_session (pet_id, session_id),
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS posts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  author      VARCHAR(100) NOT NULL,
  pet_name    VARCHAR(100) NOT NULL,
  pet_emoji   VARCHAR(20)  DEFAULT '🐾',
  content     TEXT         NOT NULL,
  likes       INT          DEFAULT 0,
  session_id  VARCHAR(64),
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_tags (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  post_id  INT         NOT NULL,
  tag      VARCHAR(50) NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_likes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  post_id     INT         NOT NULL,
  session_id  VARCHAR(64) NOT NULL,
  UNIQUE KEY uq_post_session (post_id, session_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  post_id     INT          NOT NULL,
  author      VARCHAR(100) NOT NULL,
  text        TEXT         NOT NULL,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  date        VARCHAR(100),
  location    VARCHAR(200),
  emoji       VARCHAR(20)  DEFAULT '🎉',
  color       VARCHAR(200) DEFAULT 'linear-gradient(135deg, #7C3AED, #EC4899)',
  attendees   INT          DEFAULT 0
);

CREATE TABLE IF NOT EXISTS event_attendees (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  event_id    INT         NOT NULL,
  session_id  VARCHAR(64) NOT NULL,
  UNIQUE KEY uq_event_session (event_id, session_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS otps (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(150) NOT NULL,
  code       VARCHAR(10)  NOT NULL,
  type       ENUM('register','reset','login') NOT NULL,
  expires_at DATETIME     NOT NULL,
  used       TINYINT      DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_events (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  poster_id   INT          NOT NULL,
  poster_name VARCHAR(100) NOT NULL,
  contact     VARCHAR(200) NOT NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  date        VARCHAR(100) NOT NULL,
  location    VARCHAR(200) NOT NULL,
  emoji       VARCHAR(20)  DEFAULT '🐾',
  pet_type    VARCHAR(50),
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (poster_id) REFERENCES members(id) ON DELETE CASCADE
);

-- =====================================================
-- SEED DATA — PETS
-- =====================================================

INSERT INTO pets (name, type, breed, owner, age, emoji, likes, followers, bio, color) VALUES
('Max',     'Dog',    'Golden Retriever', 'Maria Santos',   3, '🐕',  128, 245, 'Eats shoes for fun. Currently on his 3rd pair of victims.',                             '#FEF3C7'),
('Luna',    'Cat',    'Persian Cat',      'Juan dela Cruz', 2, '🐈',  200, 380, 'Gets mad if you eat before feeding her first. Very serious about this.',                '#F3E8FF'),
('Coco',    'Bird',   'Cockatiel',        'Anne Reyes',     1, '🦜',   95, 170, 'Knows how to whistle two songs. His mom cried the first time she heard it.',            '#D1FAE5'),
('Buddy',   'Dog',    'Labrador',         'Carlo Mendoza',  5, '🐶',  310, 520, 'Sleeps 14 hours a day and still looks tired. A mood.',                                  '#FEE2E2'),
('Mochi',   'Cat',    'Scottish Fold',    'Kim Flores',     2, '😸',  175, 290, 'Doesn\'t want to be held but also doesn\'t want to be ignored. Classic cat.',          '#E0E7FF'),
('Thumper', 'Rabbit', 'Holland Lop',      'Nina Garcia',    1, '🐇',  140, 210, 'Has chewed through 4 phone chargers. No remorse whatsoever.',                          '#FCE7F3'),
('Kiko',    'Dog',    'Aspin',            'Bong Reyes',     4, '🐕',   88, 155, 'Aspin siya pero sosyal pa rin. Alam niya ang oras ng kainan nang eksakto.',             '#FEF9C3'),
('Nala',    'Cat',    'Siamese',          'Trisha Lim',     3, '🐱',  220, 400, 'Talks back every time you say anything to her. Zero filter.',                           '#FDF2F8'),
('Mocha',   'Dog',    'Shih Tzu',         'Rose Aquino',    2, '🐩',  165, 310, 'Gets a professional grooming every two weeks. Knows she looks good.',                  '#FFF7ED'),
('Tweety',  'Bird',   'Lovebird',         'Isko Santos',    1, '🐦',   75, 130, 'Screams if you leave the room for more than 3 minutes. Very attached.',                '#ECFDF5'),
('Peanut',  'Rabbit', 'Lionhead',         'Cathy Cruz',     2, '🐰',  110, 185, 'Binkies every morning like he just won something. Pure joy.',                           '#FFF0F6'),
('Bruno',   'Dog',    'German Shepherd',  'Mark Torres',    6, '🐕',  290, 480, 'Retired from being scary. Now just wants belly rubs and afternoon naps.',              '#F0FDF4');

-- =====================================================
-- SEED DATA — POSTS
-- =====================================================

INSERT INTO posts (author, pet_name, pet_emoji, content, likes, created_at) VALUES
('Maria Santos',  'Max',     '🐕', 'Caught Max eating the TV remote again. I asked him why. He just looked at me and walked away. No guilt at all. 😭',                                   87,  NOW() - INTERVAL 2  HOUR),
('Juan dela Cruz','Luna',    '🐈', 'My mom called and I said I was busy. I was — Luna was on my lap and gets mad if I stop petting her. Priorities.',                                      134, NOW() - INTERVAL 5  HOUR),
('Carlo Mendoza', 'Buddy',   '🐶', 'Spent my shoe budget on a new harness for Buddy. Zero regrets. He needed it more than I did anyway.',                                                 210, NOW() - INTERVAL 1  DAY),
('Anne Reyes',    'Coco',    '🦜', 'Coco has been saying "I love you" all morning. I have no idea who taught him but honestly I needed to hear that today. 🥲',                           96,  NOW() - INTERVAL 2  DAY),
('Kim Flores',    'Mochi',   '😸', 'Mochi sat in front of the door for 20 minutes. I thought she wanted out. She just wanted me to watch her sit there.',                                 143, NOW() - INTERVAL 3  DAY),
('Nina Garcia',   'Thumper', '🐇', 'Thumper binkied for the first time today. I cried. My boyfriend said I was overreacting. He is wrong.',                                               188, NOW() - INTERVAL 4  DAY),
('Bong Reyes',    'Kiko',    '🐕', 'Kiko heard the word "bath" from two rooms away and immediately hid under the bed. The survival instincts are real.',                                  76,  NOW() - INTERVAL 5  DAY),
('Trisha Lim',    'Nala',    '🐱', 'Nala knocked my phone off the table and stared at me while she did it. Direct eye contact. No hesitation. 10/10 cat behavior.',                      215, NOW() - INTERVAL 6  DAY),
('Rose Aquino',   'Mocha',   '🐩', 'Mocha refuses to walk on the wet grass. She lifts all four paws one at a time and looks at me like it\'s my fault. 😂',                              162, NOW() - INTERVAL 7  DAY),
('Isko Santos',   'Tweety',  '🐦', 'Tried to nap. Tweety sang the entire time. I cannot be mad — the concert was actually pretty good.',                                                  91,  NOW() - INTERVAL 8  DAY),
('Cathy Cruz',    'Peanut',  '🐰', 'Peanut did three binkies in a row this morning. I don\'t know what I did right but I hope I keep doing it.',                                         127, NOW() - INTERVAL 9  DAY),
('Mark Torres',   'Bruno',   '🐕', 'Bruno is 6 and still thinks he fits on the couch with me like a small dog. 40 kilos of denial.',                                                      248, NOW() - INTERVAL 10 DAY),
('Maria Santos',  'Max',     '🐕', 'Max stole a whole hotdog from my plate and ran. The audacity. I am raising a thief.',                                                                 108, NOW() - INTERVAL 11 DAY),
('Kim Flores',    'Mochi',   '😸', 'Mochi brought me a hair tie at 3am. Placed it on my face and walked away. I think this was a gift.',                                                  176, NOW() - INTERVAL 12 DAY),
('Trisha Lim',    'Nala',    '🐱', 'Nala figured out how to open the refrigerator. I came home to her sitting inside it like it was completely normal.',                                  201, NOW() - INTERVAL 13 DAY);

-- Post tags
INSERT INTO post_tags (post_id, tag) VALUES
(1,  'dogs'),    (1,  'naughty'),  (1,  'stilllovehim'),
(2,  'cats'),    (2,  'catmom'),   (2,  'noregrets'),
(3,  'dogdad'),  (3,  'noregrets'),(3,  'labrador'),
(4,  'birds'),   (4,  'coco'),     (4,  'surprise'),
(5,  'cats'),    (5,  'mochi'),    (5,  'catthings'),
(6,  'rabbits'), (6,  'bunnylife'),(6,  'firstbinky'),
(7,  'dogs'),    (7,  'aspin'),    (7,  'bathtime'),
(8,  'cats'),    (8,  'siamese'),  (8,  'catdrama'),
(9,  'dogs'),    (9,  'shihtzu'),  (9,  'diva'),
(10, 'birds'),   (10, 'tweety'),   (10, 'morningconcert'),
(11, 'rabbits'), (11, 'peanut'),   (11, 'binkies'),
(12, 'dogs'),    (12, 'bruno'),    (12, 'bigdogproblems'),
(13, 'dogs'),    (13, 'max'),      (13, 'thief'),
(14, 'cats'),    (14, 'mochi'),    (14, 'catlogic'),
(15, 'cats'),    (15, 'nala'),     (15, 'smartcat');

-- =====================================================
-- SEED DATA — COMMENTS
-- =====================================================

INSERT INTO comments (post_id, author, text, created_at) VALUES
(1,  'Juan dela Cruz', 'Hahaha classic Max energy 😂',                                         NOW() - INTERVAL 100 MINUTE),
(1,  'Anne Reyes',     'At least he owns it lol',                                              NOW() - INTERVAL  80 MINUTE),
(1,  'Bong Reyes',     'Kiko would do the same thing. Zero guilt.',                            NOW() - INTERVAL  60 MINUTE),
(2,  'Maria Santos',   'Luna would do this. Solidarity.',                                      NOW() - INTERVAL 4 HOUR),
(2,  'Kim Flores',     'Mochi has the same rule. You wait for the cat.',                       NOW() - INTERVAL 3 HOUR),
(3,  'Nina Garcia',    'My priorities exactly 🐾',                                            NOW() - INTERVAL 20 HOUR),
(4,  'Kim Flores',     'I would also need to hear that today honestly.',                       NOW() - INTERVAL 44 HOUR),
(4,  'Trisha Lim',     'Coco is the sweetest 🥲',                                             NOW() - INTERVAL 40 HOUR),
(6,  'Cathy Cruz',     'I also cried at my first binky. Completely normal response.',          NOW() - INTERVAL 3 DAY),
(6,  'Rose Aquino',    'Peanut binkies too! I thought only mine did that.',                   NOW() - INTERVAL 3 DAY),
(8,  'Bong Reyes',     'Nala woke up and chose chaos as always 😹',                           NOW() - INTERVAL 5 DAY),
(8,  'Maria Santos',   'The eye contact makes it so much worse.',                             NOW() - INTERVAL 5 DAY),
(9,  'Juan dela Cruz', 'Luna does this too. The look of betrayal they give you is priceless.',NOW() - INTERVAL 6 DAY),
(12, 'Rose Aquino',    'Bruno knows exactly what he is doing and loves it.',                  NOW() - INTERVAL 9 DAY),
(12, 'Maria Santos',   'Max thinks he is a puppy too. 30 kilos of denial here.',             NOW() - INTERVAL 9 DAY),
(15, 'Anne Reyes',     'Nala opened the fridge?? She is literally smarter than me.',         NOW() - INTERVAL 12 DAY);

-- =====================================================
-- SEED DATA — EVENTS
-- =====================================================

INSERT INTO events (title, description, date, location, emoji, color, attendees) VALUES
('PetVerse Pawfest 2025',       'Our biggest meetup yet! Bring your pets, hang out with other fur parents, and enjoy a full day of pet-friendly activities.',                        'June 22, 2025',  'Ayala Triangle Gardens, Makati',  '🎉', 'linear-gradient(135deg, #7C3AED, #EC4899)', 230),
('Libreng Bakuna para sa Pets', 'Our partner vets are offering free rabies and multi-vaccines for dogs and cats. Bring your pet record if you have one.',                           'June 28, 2025',  'Quezon Memorial Circle, QC',      '💉', 'linear-gradient(135deg, #10B981, #3B82F6)', 180),
('Pinaka-Gwapong Pet Contest',  'Show off your fur baby! Submit a photo and the community votes. Prizes for the top 3!',                                                            'July 5, 2025',   'Online — right here on PetVerse', '📸', 'linear-gradient(135deg, #F59E0B, #EF4444)', 540),
('Dog Park Day sa Intramuros',  'Dalhin mo ang iyong aso sa aming exclusive dog park day. May agility course, treats, at litratista para sa inyong fur baby!',                     'July 12, 2025',  'Intramuros Park, Manila',          '🐕', 'linear-gradient(135deg, #F59E0B, #10B981)',  95),
('Pet Adoption Drive',          'Partner shelters are bringing over 50 animals looking for forever homes. Come meet them — you might just fall in love.',                          'July 19, 2025',  'SM Mall of Asia, Pasay',           '🏡', 'linear-gradient(135deg, #EC4899, #F59E0B)', 320),
('Cat Cafe Pop-up',             'Spend a morning surrounded by cats at our one-day pop-up cat cafe. Proceeds go to our partner cat shelter. Limited slots only!',                  'July 26, 2025',  'The Grid Food Market, BGC',        '☕', 'linear-gradient(135deg, #8B5CF6, #3B82F6)', 150);

-- =====================================================
-- SEED DATA — MEMBERS
-- =====================================================

INSERT INTO members (name, email, pet_name, pet_type) VALUES
('Maria Santos',  'maria@petverse.ph',  'Max',     'dog'),
('Juan dela Cruz','juan@petverse.ph',   'Luna',    'cat'),
('Anne Reyes',    'anne@petverse.ph',   'Coco',    'bird'),
('Carlo Mendoza', 'carlo@petverse.ph',  'Buddy',   'dog'),
('Kim Flores',    'kim@petverse.ph',    'Mochi',   'cat'),
('Nina Garcia',   'nina@petverse.ph',   'Thumper', 'rabbit'),
('Bong Reyes',    'bong@petverse.ph',   'Kiko',    'dog'),
('Trisha Lim',    'trisha@petverse.ph', 'Nala',    'cat'),
('Rose Aquino',   'rose@petverse.ph',   'Mocha',   'dog'),
('Isko Santos',   'isko@petverse.ph',   'Tweety',  'bird'),
('Cathy Cruz',    'cathy@petverse.ph',  'Peanut',  'rabbit'),
('Mark Torres',   'mark@petverse.ph',   'Bruno',   'dog');
