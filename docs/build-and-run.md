## Building and Running on Ubuntu

### 1. Install Dependencies
First, install the required build tools:

```bash
sudo apt update
sudo apt install build-essential
```

### 2. Install PerryTS
PerryTS can be installed via npm. First ensure Node.js is installed:

```bash
sudo apt install nodejs npm
npm install -g @perryts/perry
```

### 3. Verify Installation
Check that Perry is properly installed:

```bash
perry doctor
```

### 4. Build and Run the Chatroom
Navigate to the project directory and run:

```bash
cd /home/lebei/dev/perryts/chatroom

# Compile TypeScript to native executable
perry compile src/main.ts -o chatroom

# Run the compiled executable
./chatroom
```

### 5. Alternative Build Commands

**Compile without running:**

```bash
perry compile src/main.ts -o chatroom
```

**Build with optimizations:**

PerryTS automatically applies optimizations based on the `opt_level` setting in `perry.toml`. The default optimization level is 2.

**Enable type checking:**

```bash
perry compile src/main.ts -o chatroom --type-check
```

**Specify output directory:**

```bash
perry compile src/main.ts -o dist/chatroom
```

### Notes:
- The `perry.toml` file in your project specifies the build configuration:
  - Entry point: `src/main.ts`
  - Output directory: `dist`
  - Optimization level: 2

- PerryTS compiles TypeScript directly to native executables using SWC and Cranelift, so no additional runtime is needed.

- The compiled binary size is typically around 2-3MB due to aggressive optimization and dead-code elimination.

If you encounter any issues with the installation, let me know and I can help troubleshoot!