=== 9.1 | draft
@why
Machine learning on a device starts as a data problem, not a model problem. A firmware engineer who can frame the task, split the data honestly and read a confusion matrix is already ahead of most.
@need
The gesture recordings from lesson 4.13; Python with a notebook. 6 hours.
@build
::widget cm

- [ ] In the explorer, set 100 events against 900 background windows. Find the threshold with the best accuracy, and note its recall. Then find the threshold you would ship
- [ ] Load your recordings; cut them into one-second windows with a label each
- [ ] Split by *recording session*, not by window: train, validation, test
- [ ] Train a small dense network in Keras on raw windows; plot training and validation loss
- [ ] Print the confusion matrix on the test set. Which two gestures are confused?
- [ ] Record a new session on another day and test again
@how
**Framing.** Decide what goes in (one second of six IMU channels), what comes out (one of four classes), and what a mistake costs in each direction.

**Splits.** The model is fitted on the training set, tuned on the validation set, and judged once on the test set. Windows cut from one recording are near-duplicates, so splitting by window leaks the answer and inflates the score. Split by session or by person.

**Overfitting.** Training loss keeps falling while validation loss rises: the model is memorising. Remedies: more varied data, a smaller model, regularisation, stopping early.

**Metrics.** Accuracy misleads when classes are unbalanced. **Precision** is how often an alarm is right; **recall** is how many real events are caught. A product specification states both, usually as “misses per hundred” and “false alarms per hour”.
@deep
- [ ] Your model scores 98% in the notebook and 70% on the new day’s data. List three causes and how you would test each.
@when
| Problem | Approach |
| --- | --- |
| A threshold on one signal works | Use the threshold. No model |
| Patterns across time or channels, hard to write as rules | A small model |
@break
- [ ] Split by window instead of by session and compare the two test scores.
@check
1. Why split by session?
2. What does rising validation loss mean?
3. When is accuracy the wrong metric?
@stretch
- Add a “none of the above” class and see what it does to false alarms.
@read
*AI at the Edge*, the chapters on datasets and evaluation. *TinyML*, chapters 1 to 3.
@pit
- **Tuning on the test set.** It stops being a test.
- **Interview angle.** “How do you know your model will work in the field?”

=== 9.2 | draft
@why
Raw samples are a poor input for a small model. A few lines of signal processing turn them into features that make a tiny network sufficient, and that is where a firmware engineer adds most value.
@need
Lessons 0.8 and 3.4. 6 hours.
@build
::widget fft

- [ ] In the viewer, compare rectangular and Hann windows on a tone between two bins
- [ ] In Python, compute a spectrogram of a recorded clap and of speech; look at both
- [ ] On the device, compute a 256-point FFT of accelerometer data with the DSP library and print the three strongest bins
- [ ] Tape the IMU to a fan and find the rotation frequency
- [ ] Time the FFT on the device, and compare float against fixed point if the library offers both
- [ ] Retrain your gesture model on simple features (mean, variance, energy in four bands) and compare size and accuracy with raw input
@how
**Windowing** cuts the stream into overlapping frames. **The FFT** turns a frame into energy per frequency. A sequence of FFTs over time is a **spectrogram**: an image a small convolutional network can read.

For speech, energies are grouped into **mel** bands spaced like human hearing and compressed logarithmically; the further-compressed form is **MFCC**. For vibration, band energies and a few statistics are often enough.

**Filtering** removes what you do not want before it reaches the model: gravity from an accelerometer, mains hum from an analog input.

Every feature costs time and RAM on the device, every time. The feature pipeline in the notebook and on the chip must match exactly, or accuracy silently falls.
@deep
- [ ] With 16 kHz audio, 30 ms frames and a 10 ms hop, how many frames per second, and how many bytes for one second of 40 mel bands?
@when
| Signal | Typical features |
| --- | --- |
| Motion | Statistics and band energies per window |
| Vibration | Spectrum |
| Audio | Log-mel spectrogram or MFCC |
| Images | Usually none: resize and normalise |
@break
- [ ] Use a different window length on the device from the one used in training.
@check
1. What is a spectrogram?
2. Why window before an FFT?
3. Why must the feature code match in both places?
@stretch
- Run the on-device features over a recorded file and compare with Python’s output number for number.
@read
*TinyML*, the audio feature chapters. The esp-dsp documentation.
@pit
- **A feature mismatch between training and device.** The commonest cause of “it worked in the notebook”.
- **Interview angle.** “What preprocessing would you use for keyword spotting, and why?”

=== 9.3 | draft
@why
A model is only as good as the data it saw, and collecting data from a device is firmware work: correct rates, no dropped samples, honest labels.
@need
Lessons 4.4 and 6.2. 5 hours.
@build
- [ ] Extend your logger: fixed sample rate from a hardware timer, a sequence number per sample, a count of dropped samples
- [ ] Save to SD with metadata: device, firmware version, sensor range and rate, who, where, when
- [ ] Label at capture time with a button, not afterwards from memory
- [ ] Collect from three people, in three places, on three days
- [ ] Write the dataset’s own datasheet: what is in it, how it was gathered, what it does not cover
- [ ] Keep the raw data immutable and version the processing scripts
@how
Good data is **representative** of where the product will be used, **balanced** enough across classes, and correctly labelled. Variety beats volume: ten people for a minute each teach a model more than one person for an hour.

Failures to guard against: samples dropped by a busy logger; sample rates that drift; labels offset in time; all of one class recorded in one session, so the model learns the session.

**Drift.** The world changes after you ship: new users, wear, seasons. Plan to collect samples from the field and re-evaluate.
@deep
- [ ] How would you detect, on the device, that incoming data no longer looks like the training data?
@when
Collect your own data whenever the sensor, its mounting or its users differ from a public dataset’s, which is nearly always.
@break
- [ ] Train on data from one person and test on another.
@check
1. Why does variety matter more than volume?
2. What metadata must accompany a recording?
3. What is drift?
@stretch
- Add an “upload this window” command for hard cases found in use.
@read
*AI at the Edge*, the dataset chapters.
@pit
- **Relabelling by guesswork.**
- **Interview angle.** “How did you build your dataset, and what are its limits?”

=== 9.4 | draft
@why
Quantization is what makes models fit: a quarter of the size, several times the speed on your S3, and the reason the vector instructions matter. It is also plain fixed-point arithmetic from lesson 0.12.
@need
Lessons 0.12 and 9.1. 5 hours.
@build
::widget quant

- [ ] In the lab, set the range to −1.5 to 2.5 at 8 bits. Compute the scale and zero-point by hand and check
- [ ] Add an outlier to the range and watch the step size grow
- [ ] Convert your Keras model to a float TFLite file and note its size
- [ ] Convert again with full-integer quantization, giving the converter a representative sample of your data
- [ ] Evaluate both on the test set. How much accuracy did quantization cost?
- [ ] Open the quantized file in a model viewer and read the scale and zero-point of one tensor
@how
Each tensor’s real values are mapped to 8-bit integers with two numbers: **real = scale × (q − zero_point)**. The converter chooses them from the range each tensor takes on **representative data**, so that data must look like real use.

Weights get one scale per output channel; activations get one per tensor. Arithmetic then runs in integers, with the scales folded into a multiply and a shift.

**Post-training quantization** needs only the trained model and sample data. If accuracy falls too far, **quantization-aware training** simulates the rounding during training so the model learns to tolerate it.

Sensitive spots: a tensor with rare large values, and layers whose inputs have very different ranges.
@deep
- [ ] Why does one outlier in the calibration data hurt every other value in that tensor?
@when
| Target | Format |
| --- | --- |
| Microcontroller | int8, fully quantized |
| Accuracy collapses after PTQ | Quantization-aware training |
| Float is fast enough and RAM is plentiful | Rare on this class of chip |
@break
- [ ] Calibrate with random noise instead of real data and evaluate.
@check
1. Write the formula relating real values to quantized ones.
2. What is representative data for?
3. When do you need quantization-aware training?
@stretch
- Quantize to 16-bit activations and compare.
@read
The LiteRT (TensorFlow Lite) documentation on post-training quantization. *TinyML* on optimisation.
@pit
- **Forgetting to quantize the input** on the device with the input tensor’s own scale and zero-point.
- **Interview angle.** “Explain int8 quantization and its effect on accuracy.”

=== 9.5 | draft
@why
This is the centre of the course: your own trained model running on your own board, measured.
@need
Lessons 4.13 and 9.4. 6 hours.
@build
- [ ] Convert the quantized model to a C array and add it to a project with the TFLite Micro component
- [ ] Register only the operators your model uses
- [ ] Find the smallest tensor arena that works, then add a margin
- [ ] Feed a recorded test window from flash and check the output matches the notebook
- [ ] Then live: IMU task, window buffer, features, inference, result on the display
- [ ] Time `Invoke()` with the optimised kernels on and off; repeat on the ESP32-CAM’s chip
- [ ] Record flash size, arena size, time per inference and stack high-water mark in a table
@how
The **model** is a read-only array in flash. The **interpreter** reads it once, plans every tensor’s place in the **arena**, and thereafter allocates nothing. The **op resolver** links in only the kernels you registered, which keeps the binary small.

One inference: write quantized input into the input tensor, invoke, read the output tensor and dequantize.

On the S3, Espressif’s optimised kernels use the chip’s vector instructions; the component’s own figures show person detection falling from seconds to tens of milliseconds. Your measurement on your model is what counts.

Verify in stages: the same input must give the same output in the notebook’s TFLite interpreter and on the device, before you connect a live sensor.
@deep
- [ ] The arena sits in internal RAM. What happens to inference time if you move it to PSRAM, and why?
@when
| Runtime | Choose when |
| --- | --- |
| TFLite Micro | Portability across chips, large community |
| ESP-DL | Espressif chips only, PyTorch or ONNX workflow (lesson 9.7) |
@break
- [ ] Leave one operator unregistered and read the error.
@check
1. What does the interpreter do at start-up?
2. Why register operators individually?
3. How do you verify the device against the notebook?
@stretch
- Run inference in its own task at lower priority than the sampler and prove no samples are dropped.
@read
The esp-tflite-micro README and examples. *TinyML*, the deployment chapters.
@pit
- **Debugging accuracy on live data first.** Fix a replayed input before trusting a sensor.
- **Interview angle.** “Walk me through deploying a model to a microcontroller.”

=== 9.6 | draft
@why
A model that does not fit is not a model. Budgeting size, RAM and latency, and knowing which lever moves which, is the engineering half of edge AI.
@need
Lesson 9.5. 5 hours.
@build
- [ ] Write your budget: flash, arena, milliseconds per inference, with the reasons for each number
- [ ] Train three sizes of the same network; plot accuracy against arena size and latency
- [ ] Prune one model and fine-tune it; compare size and speed honestly
- [ ] Distil the large model into the small one and compare with training the small one directly
- [ ] If post-training quantization cost you accuracy, apply quantization-aware training
- [ ] Choose one model and justify it against the budget
@how
| Lever | Reduces | Cost |
| --- | --- | --- |
| Smaller architecture | Flash, RAM, time | Accuracy |
| Quantization | Flash ×4, time | A little accuracy |
| Pruning | Flash, if stored sparsely | Little speed gain without sparse kernels |
| Distillation | Nothing directly; it makes a small model more accurate | Training effort |
| Smaller input | RAM and time, sharply | Detail |

**RAM** is set by the largest pair of consecutive activation tensors, not by the number of weights. **Latency** follows the number of multiply-accumulates. **Flash** follows the parameter count.

Input size is the strongest lever: halving an image’s side quarters the work.
@deep
- [ ] Your model has few parameters and a huge arena. Which layer is responsible?
@when
Decide the budget before training, from the product: battery, response time, the other things the chip must do.
@break
- [ ] Pick the most accurate model regardless of budget and try to run it.
@check
1. What determines arena size?
2. Which lever cuts latency most?
3. What does distillation do?
@stretch
- Automate the sweep and plot the trade-off curve.
@read
*AI at the Edge* on optimisation. *TinyML*, “Optimizing Latency” and “Optimizing Model and Binary Size”.
@pit
- **Optimising parameter count when RAM is the binding limit.**
- **Interview angle.** “The model is too slow on the target. What do you try, in order?”

=== 9.7 | draft
@why
Espressif’s own inference library is built for its chips and for a PyTorch-centred workflow. Knowing a second runtime lets you choose, and postings ask for more than one.
@need
Lesson 9.5; PyTorch or an ONNX export of your model. 5 hours.
@build
- [ ] Read ESP-DL’s list of supported operators and check your model against it
- [ ] Export the model to ONNX and quantize it to the `.espdl` format with Espressif’s quantization tool
- [ ] Run it on the S3 from the library’s example structure
- [ ] Compare with TFLite Micro: binary size, RAM, time per inference, accuracy on the same test windows
- [ ] Run one model from the model zoo
@how
ESP-DL takes a model through ONNX, quantizes it with its own tool, and stores it in a compact format that the device loads directly. Its kernels are written for the S3’s vector instructions and the P4.

The flow differs from TFLite Micro mainly in where quantization happens and in the file format; the concepts (scale, calibration data, operator support, a memory plan) are the same.

It requires a recent ESP-IDF; check the version stated in its README against the one your toolchain provides.
@deep
- [ ] An operator in your model is unsupported. What are your three options?
@when
| Situation | Runtime |
| --- | --- |
| Must also run on non-Espressif chips | TFLite Micro |
| Espressif only, PyTorch workflow, vision models from the zoo | ESP-DL |
@break
- [ ] Quantize with too little calibration data and compare outputs.
@check
1. What format does ESP-DL load?
2. Through which interchange format do models reach it?
3. How would you choose between the two runtimes?
@stretch
- Profile per-layer time and find the slowest layer.
@read
The ESP-DL repository’s README and “getting started” documents.
@pit
- **Assuming every operator is supported.**
- **Interview angle.** “Which inference runtimes have you used, and how do they differ?”

=== 9.8 | draft
@why
Edge Impulse compresses the whole workflow, data to deployable library, into a browser. It is fast for a first result, and understanding what it generates keeps you in control.
@need
An account; your logger. Lesson 9.5. 4 hours.
@build
- [ ] Stream IMU data to a project with the data forwarder from your existing serial logger
- [ ] Design an impulse: window, a spectral feature block, a small classifier
- [ ] Train, and read the confusion matrix and the estimated RAM, flash and latency
- [ ] Export the C++ library and build it into an ESP-IDF project
- [ ] Compare its on-device numbers with the estimates, and with your hand-built model
- [ ] Read the generated code: find the feature extraction and the model
@how
An **impulse** is the pipeline: windowing, a signal-processing block, a learning block. The platform trains it, estimates its cost on a named target, and exports portable C++ containing both the features and the model, so training and device match by construction.

Its compiler can turn the model into plain code without an interpreter, saving RAM.

Official firmware exists for a few boards; for yours, the generic C++ library export is the route.

What you still own: the quality of the data, the sensor driver, the timing of the sampling, and the decision about what to do with a result.
@deep
- [ ] What would you lose if the service were unavailable, and how would you protect a product against that?
@when
| Use it for | Build by hand when |
| --- | --- |
| Fast first results, feature exploration, teams without ML specialists | You need an unusual model, full control, or no external dependency |
@break
- [ ] Sample at a different rate on the device from the rate the impulse was designed for.
@check
1. What is an impulse?
2. Why do exported features match training?
3. What remains your responsibility?
@stretch
- Try its object-detection approach designed for microcontrollers on camera data.
@read
Edge Impulse documentation: the data forwarder and “Running your impulse locally”.
@pit
- **Treating the estimate as a measurement.**
- **Interview angle.** “Have you used an MLOps tool for embedded? What does it hide?”

=== 9.9 | draft
@why
Vision is where memory runs out. A camera pipeline is a sequence of buffers, and getting their sizes, formats and ownership right is most of the work.
@need
An ESP32-CAM or an S3 camera board. Lessons 3.10 and 9.5. 8 hours.
@build
- [ ] Capture a greyscale frame at a small size and print where its buffer lives
- [ ] Resize to the model’s input (96×96 for the standard person-detection model) and convert to int8 with the input tensor’s scale
- [ ] Run the person-detection model and print both scores
- [ ] Time each stage: capture, resize, inference
- [ ] Use two frame buffers so capture continues while you process
- [ ] Add a decision rule: several positive frames in a row before reporting
- [ ] Measure frames per second and peak RAM, on the S3 and on the classic chip
@how
The stages: sensor to frame buffer by DMA; **preprocess** (crop, resize, convert colour, normalise, quantize); inference; **postprocess** (threshold, smooth over time).

Frame buffers go in **PSRAM**: there is nowhere else for them. The model’s arena should stay in fast internal RAM if it fits.

**Double buffering** lets the camera fill one buffer while you read another. If processing is slower than capture, drop frames deliberately and always take the newest.

Preprocessing is often slower than you expect, and a mismatch with training (channel order, value range) quietly ruins accuracy.

Espressif’s vision framework packages detection and recognition examples built on this same pipeline.
@deep
- [ ] 96×96 greyscale in, two scores out. How many bytes cross each stage boundary?
@when
| Task | Approach on this class of chip |
| --- | --- |
| Is there a person? | Classification at low resolution |
| Where is the object? | A detector designed for microcontrollers, at low frame rate |
| Reading text, recognising many classes | Send the frame to a larger machine |
@break
- [ ] Feed RGB data to a model trained on greyscale.
@check
1. Where do frame buffers live, and why?
2. What does double buffering solve?
3. Name two preprocessing mistakes that hurt accuracy.
@stretch
- Wake from sleep on motion, classify, and sleep again.
@read
The person-detection example in esp-tflite-micro. ESP-WHO’s documentation.
@pit
- **Optimising the model when resizing is the bottleneck.**
- **Interview angle.** “Describe an image pipeline on a memory-constrained device.”

=== 9.10 | draft
@why
A model that drains the battery in a day is not deployable. Energy per inference, and how often you run one, is the last budget.
@need
Lessons 6.5 and 9.5. 4 hours.
@build
::widget power

- [ ] Measure current during inference and its duration; compute millijoules per inference
- [ ] Compare CPU at full speed against a lower frequency: is slower cheaper per inference?
- [ ] Duty-cycle: sleep, wake, sample one window, infer, sleep. Compute and then measure the average current
- [ ] Add a cheap first stage: a threshold on signal energy that wakes the model only when something is happening
- [ ] Estimate battery life for one inference per second and for one per minute
@how
**Energy = power × time.** A faster inference at higher power often costs less energy than a slow one, because the chip can sleep sooner: “race to idle”.

**Cascades** save the most. A trivial detector runs always; the expensive model runs only when it fires. This is how every always-listening device works.

On the S3, quantized models use the vector instructions; float models do not. Arenas in PSRAM are slower, so the chip is awake longer.

The whole system matters: a sensor that draws a milliamp continuously can dominate a model that runs for 20 ms a second.
@deep
- [ ] Your wake-word model runs 20 times a second. Design a two-stage cascade and estimate the saving.
@when
| Requirement | Design |
| --- | --- |
| Always watching, battery powered | Cascade plus duty cycling |
| Occasional decision | Deep sleep between inferences |
@break
- [ ] Leave the sensor powered through sleep and remeasure.
@check
1. What is “race to idle”?
2. How does a cascade save energy?
3. Why can PSRAM raise energy use?
@stretch
- Report energy per inference in your model card.
@read
*AI at the Edge* on power. The S3 datasheet’s current tables.
@pit
- **Measuring the model and forgetting the sensor and radio.**
- **Interview angle.** “How would you run inference continuously on a coin cell?”

=== 9.11 | draft
@why
The ESP32-S3 is one point on a line that runs from tiny Cortex-M chips to Jetson modules with GPUs. Roles ask where you would put a workload, and why.
@need
The Nucleo, if you have one. Phase 9 so far. 5 hours, partly reading.
@build
- [ ] Run your gesture model on the Nucleo with the vendor’s model converter or TFLite Micro with CMSIS-NN; compare time and RAM with the S3
- [ ] Fill in a table for a Cortex-M4, the ESP32-S3, a Cortex-M55 with an NPU, a Raspberry Pi 5 and a Jetson Orin Nano: RAM, typical model size, power, price class
- [ ] Place five workloads on that line: wake word, gesture, person presence, object detection at 30 frames per second, a small language model
- [ ] Write one page: where microcontroller-class edge AI ends and Jetson-class begins, with numbers
@how
**Cortex-M** chips run TFLite Micro with **CMSIS-NN** kernels. Newer cores add vector extensions, and some pair with a small **NPU** such as Ethos-U that runs supported operators many times faster. Vendors provide converters that turn a model into optimised C for their parts.

**Jetson** is a Linux computer with a GPU. Models are compiled with **TensorRT** into engines for that exact GPU; **CUDA** is the programming layer beneath; **DeepStream** is a pipeline framework for video analytics; **Isaac** is the robotics stack. Memory is measured in gigabytes and power in watts.

The boundary is set by memory and power. Kilobytes of activations and milliwatts: a microcontroller. Megabytes to gigabytes, full-resolution video, large networks: an accelerator or a GPU. Many systems use both, with the small device deciding when to wake the large one.
@deep
- [ ] Design a doorbell: what runs on a microcontroller, what on a Jetson, and what crosses the link?
@when
| Workload | Platform |
| --- | --- |
| Always-on sensing, small models | Microcontroller |
| Medium vision models at a few frames per second | Microcontroller with NPU, or a small Linux board with an accelerator |
| Multi-camera video, large models | Jetson-class |
@break
- [ ] Try to place a model with 50 MB of weights on the S3 and say what stops you first.
@check
1. What is an NPU?
2. What does TensorRT do?
3. What sets the boundary between MCU-class and GPU-class edge AI?
@stretch
- Build the capstone: a battery-powered, OTA-updatable, MQTT-reporting edge-AI node with a measured power budget, latency benchmarks and a model card.
@read
Arm’s CMSIS-NN overview. NVIDIA’s Jetson documentation on TensorRT.
@pit
- **Choosing the platform before sizing the model.**
- **Interview angle.** “Where would you run this model, and why not somewhere else?”
