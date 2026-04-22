# PBT205 Assessment 1

## Student / Group Details
- Group Name:
- Member 1:
- Member 2:
- Member 3:
- Member 4:

## Middleware Setup
RabbitMQ was used as the middleware for all three prototypes.
Docker Desktop was used to run RabbitMQ.

Run command:
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management

RabbitMQ dashboard:
http://localhost:15672

## Task 1: Chatting Application
Files:
- task1-chat/chat.js

Arguments:
- username
- middleware endpoint
- room

Features:
- joins a room
- subscribes to room messages
- sends user-entered messages
- displays messages from other users

Example run:
node chat.js swapno amqp://localhost room1
node chat.js rafi amqp://localhost room1

## Task 2: Trading System
Files:
- task2-trading/sendOrder.js
- task2-trading/exchange.js

Features:
- sends BUY/SELL orders
- quantity fixed at 100
- exchange matches acceptable opposite-side prices
- successful trades are displayed

Example run:
node exchange.js amqp://localhost
node sendOrder.js swapno amqp://localhost BUY 100 120
node sendOrder.js rafi amqp://localhost SELL 100 115

## Task 3: Contact Tracing
Files:
- task3-contact/tracker.js
- task3-contact/person.js
- task3-contact/query.js

Features:
- tracker stores positions
- person moves randomly one square at a time
- encounters are logged
- query returns contacts

Example run:
node tracker.js amqp://localhost 10 10
node person.js amqp://localhost alice fast 10 10
node person.js amqp://localhost bob fast 10 10
node query.js amqp://localhost alice

## Testing Evidence
Screenshots are included in the screenshots folder:
- rabbitmq-running.png
- task1-chat.png
- task2-trade-done.png
- task3-contact.png
- task3-query.png

## Challenges and Fixes
- RabbitMQ setup completed using Docker
- Multiple terminals were used for testing
- Random movement in contact tracing required repeated runs
- Smaller board size and fast mode improved encounter testing

## Conclusion
All three required middleware-based command-line prototypes were implemented successfully using RabbitMQ.