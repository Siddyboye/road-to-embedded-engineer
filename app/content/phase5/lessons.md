=== 5.1 | draft
@why
A connected product spends most of its life reconnecting. The happy path is ten lines; the engineering is what happens when the router reboots at 3 a.m.
@need
An S3 board and a Wi-Fi network you control. Lessons 4.6 and 2.10. 4 hours.
@build
- [ ] Connect as a station using the event loop: handle “started”, “disconnected” and “got IP” as events, never as a delay loop
- [ ] Track state in an event group so other tasks can wait for “connected”
- [ ] Unplug the router for a minute. Reconnect with exponential back-off, capped, with a little randomness
- [ ] Print the disconnect reason each time; try a wrong password
- [ ] Start an access point and connect your phone to it
- [ ] Measure current during connection with your power meter
@how
Wi-Fi runs in its own high-priority task and tells you what happened through **events**. Connecting is asynchronous: you ask, and later an event says it worked or why it failed.

**Station** mode joins a network; **access point** mode creates one, usually just for set-up. Getting an address by DHCP is a separate step after association, with its own event.

Retrying immediately and for ever drains batteries and hammers a recovering router. **Back-off** waits longer after each failure; **jitter** stops a hundred devices retrying in step.
@deep
- [ ] What should the device do with sensor readings taken while offline?
@when
| Link | Use Wi-Fi when |
| --- | --- |
| Mains power or large battery, a network exists | Yes |
| Coin cell, tiny payloads | BLE or LoRa |
@break
- [ ] Block inside an event handler and watch the connection stall.
@check
1. Why is connecting event-driven?
2. What are back-off and jitter for?
3. Which two steps must both succeed before you can send data?
@stretch
- Scan for networks and choose the strongest of several known ones.
@read
ESP-IDF guide: “Wi-Fi Driver”, the event and reconnect sections.
@pit
- **Credentials in source control.**
- **Interview angle.** “How do you make a device’s connection robust?”

=== 5.2 | draft
@why
A product cannot ship with your home network’s password compiled in. Provisioning is how a customer gives the device its credentials, and it is the first thing a security reviewer looks at.
@need
Lesson 5.1 and a phone. 3 hours.
@build
- [ ] Run the provisioning example for your ESP-IDF version over BLE or a temporary access point; use Espressif’s phone app to send credentials
- [ ] Confirm the credentials survive a reboot. Where are they stored?
- [ ] Add a “factory reset”: hold a button for five seconds to erase them
- [ ] Handle a wrong password: return to provisioning instead of retrying for ever
@how
The device starts with no credentials and offers a temporary, authenticated channel: BLE, or its own access point. The app sends the network name and password over an encrypted session, proven by a code printed on the device. The device stores them in NVS and connects.

Three things make it a product feature and not a demo: proof of possession so a neighbour cannot provision your device; a way back when credentials are wrong; and a deliberate reset.
@deep
- [ ] What can an attacker in radio range do during provisioning, with and without proof of possession?
@when
| Method | Trade |
| --- | --- |
| BLE | Best experience; needs BLE in the product |
| Temporary access point | No BLE needed; the phone must switch networks |
@break
- [ ] Provision with a wrong password and check the device does not lock itself out.
@check
1. Where do credentials live after provisioning?
2. What is proof of possession for?
3. What must happen when stored credentials stop working?
@stretch
- Show a QR code on the display for the app to scan.
@read
ESP-IDF guide: the unified provisioning documentation for your version.
@pit
- **No recovery path.** One typo and the device is unreachable.
- **Interview angle.** “How does a headless device get onto a customer’s Wi-Fi?”

=== 5.3 | draft
@why
Every network protocol above this is a pattern of bytes on a TCP or UDP socket. Seeing those bytes in a capture is the networking equivalent of the logic analyzer.
@need
Lesson 5.1; Wireshark on your computer. 3 hours.
@build
- [ ] Write a TCP echo server on the board; connect with `nc` and type
- [ ] Capture it in Wireshark: find the three-way handshake, your data, the acknowledgements and the close
- [ ] Send a reading every second by UDP to your computer; drop the link briefly and see what is lost
- [ ] Set a receive timeout so a silent peer does not block the task for ever
- [ ] Handle the peer disconnecting: what does `recv` return?
@how
**IP** delivers packets to an address, with no promises. **UDP** adds ports and nothing else: a datagram arrives whole or not at all, possibly out of order. **TCP** builds a reliable, ordered **byte stream** with acknowledgements and retransmission, at the cost of connection set-up, memory per connection and unpredictable delays when packets are lost.

TCP has no message boundaries: two sends may arrive as one receive, or one as two. Your framing from lesson 1.14 is what restores them.

The sockets API is the same one used on every operating system; here it is provided by the lwIP stack, running as a task.
@deep
- [ ] Why can a TCP “send” succeed although the data never arrives?
@when
| Traffic | Transport |
| --- | --- |
| Must arrive, in order | TCP |
| Latest value matters, old ones are worthless; discovery; time sync | UDP |
@break
- [ ] Assume one `recv` returns one whole message and send two quickly.
@check
1. What does TCP guarantee that UDP does not?
2. Why does TCP need framing on top?
3. What does a return of zero from `recv` mean?
@stretch
- Serve two clients at once with `select`.
@read
ESP-IDF guide: “lwIP”. “Beej’s Guide to Network Programming”, free online.
@pit
- **No timeouts on sockets.**
- **Interview angle.** “TCP versus UDP: when each?”

=== 5.4 | draft
@why
Devices fetch configuration, post data and download updates over HTTPS. TLS is what makes that safe, and misconfiguring it is the commonest serious security flaw in IoT products.
@need
Lesson 5.3. 4 hours.
@build
- [ ] Make an HTTP GET with the HTTP client and print the status and body
- [ ] Switch to HTTPS using the built-in certificate bundle
- [ ] Pin one server’s root certificate instead, embedded in the firmware
- [ ] Point the same code at a server with a different certificate. It must fail: confirm it does
- [ ] Set the clock wrong by a year and see the handshake fail; note why TLS needs time
- [ ] Measure the heap used during the handshake
@how
**HTTP** is text: a request line, headers, a blank line, a body; a status code comes back.

**TLS** wraps the connection. The server presents a **certificate**; the device checks that it was signed by an authority it trusts, that it names the right host and that it is in date. Then both sides agree keys and everything is encrypted.

The device’s trust comes from certificates stored in the firmware: a bundle of public authorities, or one pinned root. Skipping verification makes the encryption worthless: anyone can impersonate the server.

TLS is expensive on a microcontroller: tens of kilobytes of RAM and a second or more of handshake. Reuse connections.
@deep
- [ ] The pinned certificate expires in five years and devices live for ten. What is your plan?
@when
| Choice | When |
| --- | --- |
| Certificate bundle | Talking to arbitrary public servers |
| Pinned root | Your own backend |
| Plain HTTP | Never across a network you do not control |
@break
- [ ] Disable certificate verification “to get it working” and write down what you would have shipped.
@check
1. What does the device verify in a certificate?
2. Why does TLS need the correct time?
3. What does skipping verification allow?
@stretch
- Serve a page from the device with the HTTP server component.
@read
ESP-IDF guide: “ESP HTTP Client” and “ESP-TLS”.
@pit
- **Verification switched off in production.**
- **Interview angle.** “How does TLS protect a device’s connection, and what can go wrong?”

=== 5.5 | draft
@why
MQTT is how most fleets of devices report and receive commands: small, tolerant of bad links, and decoupled through a broker.
@need
Lesson 5.4; a broker on your computer (Mosquitto). 4 hours.
@build
- [ ] Add the MQTT client as a managed component (in ESP-IDF v6.1 it is no longer built in) and connect to your broker
- [ ] Publish temperature every ten seconds to `home/room1/temperature`; subscribe from your computer
- [ ] Subscribe on the device to `home/room1/led/set` and act on it
- [ ] Publish a retained “online” on connect and set a last-will of “offline”. Pull the power and watch the broker announce it
- [ ] Publish at QoS 0 and QoS 1 while toggling Wi-Fi; count what arrives
@how
Clients connect to a **broker** and never to each other. A publisher sends a message to a **topic**, a path-like name; the broker forwards it to every subscriber of that topic. Wildcards subscribe to families of topics.

**QoS 0:** sent once, may be lost. **QoS 1:** acknowledged and retried, may arrive twice. **QoS 2:** exactly once, at double the traffic.

A **retained** message is kept by the broker and given to new subscribers at once: ideal for state. The **last will** is a message the broker publishes for you if you vanish without saying goodbye.

Design topics like an API: stable, hierarchical, state separate from commands.
@deep
- [ ] With QoS 1, a “toggle” command may arrive twice. How should commands be designed so that does not matter?
@when
| Pattern | Protocol |
| --- | --- |
| Many devices, telemetry and commands | MQTT |
| Request and response with a server | HTTPS |
| Very constrained, UDP-only links | CoAP |
@break
- [ ] Connect two devices with the same client ID.
@check
1. What does the broker do?
2. What can QoS 1 do that QoS 0 cannot, and at what cost?
3. What is a last-will message for?
@stretch
- Use TLS to the broker with a client certificate.
@read
ESP-MQTT documentation. The MQTT 3.1.1 specification’s introduction.
@pit
- **Commands that are not idempotent.**
- **Interview angle.** “Explain MQTT QoS levels.”

=== 5.6 | draft
@why
A device you can open in a browser on the local network needs no cloud and no app. Three small protocols make that work.
@need
Lessons 5.4 and 6.2 (or embed the page in the firmware for now). 3 hours.
@build
- [ ] Announce the device with mDNS and open it by name from your browser
- [ ] Set the clock with SNTP and print local time with a time-zone string
- [ ] Serve a page; push live sensor values to it over a WebSocket
- [ ] Count how many browser tabs the device can serve at once
@how
**mDNS** answers name queries on the local network, so the device is `sensor.local` and not an address that changes.

**SNTP** fetches the time from a server. Until it has, the clock reads 1970, and TLS and timestamps are wrong.

A **WebSocket** upgrades an HTTP connection into a two-way message channel, so the device can push updates without the page polling.

**CoAP** is HTTP’s ideas (resources, GET, PUT) over UDP in a few bytes, for networks too constrained for TCP. Know that it exists.
@deep
- [ ] What should the firmware do with timestamps taken before the clock was set?
@when
| Need | Use |
| --- | --- |
| Find the device by name locally | mDNS |
| Live updates in a browser | WebSocket |
| Correct time | SNTP, plus an RTC to survive outages |
@break
- [ ] Open twenty connections and watch the heap.
@check
1. What problem does mDNS solve?
2. Why does a device need the time?
3. How does a WebSocket differ from repeated HTTP requests?
@stretch
- Add a settings form that writes to NVS.
@read
ESP-IDF guide: “HTTP Server”, “mDNS Service”, “System Time”.
@pit
- **Unbounded connections.** Each costs RAM.
- **Interview angle.** “How would a user configure a headless device locally?”

=== 5.7 | draft
@why
Bluetooth Low Energy is how a device talks to a phone, and how battery devices communicate at all. Its model, attributes instead of streams, is different from everything so far.
@need
An S3 board and a phone with a BLE scanner app. 5 hours.
@build
- [ ] Start from the NimBLE peripheral example for your version. Advertise with your own device name and find it from the phone
- [ ] Define a service with two characteristics: temperature (read and notify) and LED (write)
- [ ] Read, subscribe and write from the phone app
- [ ] Capture the advertising data’s raw bytes and decode the length-type-value records
- [ ] Require pairing before the LED characteristic can be written
- [ ] Measure current while advertising at 100 ms and at 1 s intervals
@how
A **peripheral** advertises: short broadcasts saying “I exist, this is what I am”. A **central**, usually a phone, scans and connects.

Once connected, data is exposed as **GATT**: a table of **characteristics** grouped into **services**, each with a UUID and permissions. The central reads and writes them; the peripheral can **notify** when one changes. There is no stream: everything is a small named value.

**Pairing** establishes keys; **bonding** stores them. Without it, anyone in range can read and write.

Power is governed by intervals: how often you advertise, and how often a connection wakes. The S3 has BLE only, no Bluetooth Classic.
@deep
- [ ] A characteristic holds at most a few hundred bytes. How would you transfer a 100 KB file?
@when
| Link | Use BLE when |
| --- | --- |
| Phone is the user interface | Yes |
| Years on a coin cell | Yes |
| Megabytes, or internet without a phone | Wi-Fi |
@break
- [ ] Leave the write characteristic open and change the LED from a stranger’s phone app.
@check
1. What is the difference between advertising and a connection?
2. What is a characteristic?
3. What do pairing and bonding provide?
@stretch
- Implement the standard Environmental Sensing service so generic apps understand your device.
@read
ESP-IDF guide: “NimBLE-based host APIs”. Bluetooth SIG’s GATT overview.
@pit
- **Treating BLE as a serial cable.**
- **Interview angle.** “Explain GATT: services, characteristics, notifications.”

=== 5.8 | draft
@why
Sometimes two devices only need to talk to each other, instantly, with no router. ESP-NOW does that in a few lines and a few milliseconds.
@need
Two ESP32 boards. Lesson 5.1. 2 hours.
@build
- [ ] Send a struct from one board to the other by MAC address; print it on arrival
- [ ] Use the send callback to learn whether the peer acknowledged
- [ ] Measure the time from button press on one to LED on the other
- [ ] Walk away until packets drop; note the range
- [ ] Enable encryption between the pair
@how
ESP-NOW sends small frames directly between Espressif chips over the Wi-Fi radio, with no access point, no IP and no connection set-up. Frames are addressed by MAC and may be acknowledged at the link layer.

It is fast and simple, and it is not a network: no routing, a small payload, a limited number of encrypted peers, and both ends must be on the same channel. It is proprietary to Espressif chips.
@deep
- [ ] How would a sleeping sensor and an always-on hub use ESP-NOW to minimise the sensor’s awake time?
@when
| Use it for | Not for |
| --- | --- |
| Remote controls, sensor to hub, wireless serial cable | Internet access, other vendors’ devices, large data |
@break
- [ ] Put the two boards on different Wi-Fi channels.
@check
1. What does ESP-NOW not need that Wi-Fi does?
2. How is a peer addressed?
3. Name two limits.
@stretch
- Build a hub that forwards ESP-NOW readings to MQTT.
@read
ESP-IDF guide: “ESP-NOW”.
@pit
- **Forgetting the channel must match the access point’s when the hub also uses Wi-Fi.**
- **Interview angle.** Compare the links you have used by power, range and data rate.

=== 5.9 | draft
@why
Lesson 2.13 explained safe updates. Now you ship one: over HTTPS, with a self-test, and a deliberately bad image to prove the rollback works.
@need
Lessons 2.13 and 5.4; a file server on your computer. 4 hours.
@build
- [ ] Switch to a two-slot partition table and enable rollback in the bootloader configuration
- [ ] Serve version 2 of your firmware over HTTPS; have version 1 download and install it with the HTTPS OTA component
- [ ] On first boot of a new image, run a self-test (Wi-Fi connects, sensor answers); only then mark the image valid
- [ ] Build a version 3 that crashes after five seconds. Install it and watch the device return to version 2
- [ ] Cut power in the middle of a download. Confirm the old image still runs
- [ ] Print the running version and partition at boot
@how
The update is written to the inactive slot while the active one runs. After verification, the boot record is switched and the device restarts.

With **rollback** enabled, a new image boots in a pending state. Your code must call the “mark valid” function once it has proved itself. If the device resets first, the bootloader reverts.

The self-test is the design decision: it should prove the device can do the one thing that lets you update it again.
@deep
- [ ] Who is allowed to tell the device to update, and how does the device know the image is yours? Lesson 5.10 continues.
@when
| Fleet | Strategy |
| --- | --- |
| A few devices | Manual trigger |
| Many | Staged rollout: 1%, then 10%, then all, watching telemetry |
@break
- [ ] Mark the image valid as the first line of `app_main`, then install the crashing build.
@check
1. When should an image be marked valid?
2. What happens to a pending image that resets?
3. What should the self-test prove?
@stretch
- Report the result of each update over MQTT.
@read
ESP-IDF guide: “Over The Air Updates (OTA)” and “ESP HTTPS OTA”.
@pit
- **An update that breaks the updater.**
- **Interview angle.** “Describe an OTA system you would trust in the field.”

=== 5.10 | draft
@why
A connected device is a computer on someone’s network, physically in an attacker’s hands. Security is a set of specific mechanisms answering specific threats, and several are irreversible.
@need
One S3 board you are willing to sacrifice. Lessons 1.7 and 5.9. 5 hours, read everything first.
@build
- [ ] Threat-model your MQTT node on one page: assets, attackers, entry points, and what each mitigation costs
- [ ] Dump your own firmware over USB with the flashing tool and search it for strings. What did you find?
- [ ] On the sacrificial board only: enable flash encryption in **development** mode and repeat the dump
- [ ] Encrypt the NVS partition and confirm stored credentials are unreadable in a dump
- [ ] Read, do not yet enable, the secure boot procedure. List every irreversible step
@how
**Threat modelling** asks: what is worth protecting, from whom, and by which route? Answers drive everything else.

**Secure boot** makes the chip run only firmware signed with your key: the bootloader verifies the app, and the ROM verifies the bootloader, anchored in a key digest burned into **eFuses**. **Flash encryption** makes the contents of flash unreadable without a key held in eFuses. **NVS encryption** protects stored credentials.

eFuses are one-time programmable. A wrong step in release mode permanently locks or bricks the chip, which is why you practise in development mode on a board set aside for it.

Keys are the real problem: where the signing key lives, who can use it, and what happens if it leaks. Software cannot fix a signing key in a public repository.
@deep
- [ ] ESP-IDF release notes for 2026 disabled one secure-boot scheme on some newer chips after a vulnerability. What does that tell you about planning for security updates?
@when
| Product | Minimum |
| --- | --- |
| Hobby project | TLS with verification, no secrets in the repository |
| Shipped product | Secure boot, flash encryption, per-device credentials, signed OTA |
@break
- [ ] Find a secret in your own Git history.
@check
1. What does secure boot guarantee?
2. What does flash encryption protect against?
3. Why are eFuse operations dangerous?
@stretch
- Give each device its own certificate instead of a shared password.
@read
ESP-IDF guide: “Security Overview”, “Secure Boot v2”, “Flash Encryption”.
@pit
- **One password for the whole fleet.**
- **Interview angle.** “How would you secure an IoT device?” Start with the threat model.

=== 5.11 | draft
@why
Wi-Fi and BLE are not the only radios. Long range at tiny data rates, and mesh networks for buildings, are whole product categories you should be able to place.
@need
Two LoRa modules if you bought them; otherwise read-only. 3 hours.
@build
- [ ] With modules: wire one to each board over SPI, send a counter point to point, and measure range in the open and through walls
- [ ] Vary the spreading factor and record range, time on air and data rate
- [ ] Without modules: compute time on air for a 20-byte packet at the slowest and fastest settings from a LoRa calculator
- [ ] Either way: fill in a table of Wi-Fi, BLE, LoRa, Zigbee, Thread and cellular by range, data rate, power and infrastructure needed
@how
**LoRa** is a radio modulation that trades data rate for range: kilometres, at a few hundred bits per second, on milliwatts. **LoRaWAN** is the network on top: gateways, a network server, and strict duty-cycle rules. In India the band is 865 to 867 MHz.

**Zigbee** and **Thread** are low-power mesh networks on a different radio (802.15.4): devices relay for each other. **Matter** is an application standard for smart-home devices that runs over Thread and Wi-Fi.

**Ethernet** gives a wired, deterministic link; the classic ESP32 has the controller built in and needs only a transceiver. **Modbus TCP** is lesson 3.7’s protocol over that or Wi-Fi.

**Cellular** variants for devices, LTE-M and NB-IoT, give coverage anywhere at the cost of a modem, a SIM and a subscription.
@deep
- [ ] A soil sensor reports 12 bytes every hour from a field 3 km from the house. Choose the radio and justify it against two alternatives.
@when
See your table: this lesson is the “when” for wireless.
@break
- [ ] Transmit continuously on LoRa and work out by how much you exceeded the legal duty cycle.
@check
1. What does LoRa trade for range?
2. What is the difference between Thread and Matter?
3. When is cellular the right answer?
@stretch
- Join a public LoRaWAN network if one covers you.
@read
Semtech’s “LoRa and LoRaWAN” introduction. The Thread Group’s overview.
@pit
- **Choosing a radio before knowing the payload, range and power budget.**
- **Interview angle.** “Which wireless technology for this product, and why?”
