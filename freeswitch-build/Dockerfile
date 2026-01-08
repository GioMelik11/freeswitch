# Use the base image with all dependencies
FROM freeswitch-base:latest

# Set environment variables
ENV FS_INSTALL_PREFIX=/usr/local/freeswitch
ENV PATH=${FS_INSTALL_PREFIX}/bin:${PATH}

# Set working directory
WORKDIR /usr/src

# Clone FreeSWITCH source code (only if not already present)
RUN if [ ! -d "freeswitch" ]; then \
    git clone https://github.com/signalwire/freeswitch.git freeswitch; \
    fi

WORKDIR /usr/src/freeswitch

# Checkout latest stable version (you can change this to a specific version)
RUN git fetch && git checkout v1.10.10

# Disable mod_signalwire before bootstrap (keep mod_verto and mod_spandsp enabled)
# Ensure mod_audio_fork and other audio modules are enabled
RUN if [ -f modules.conf.in ]; then \
    sed -i '/signalwire/s/^/#/' modules.conf.in; \
    # Uncomment mod_audio_fork if it exists and is commented
    sed -i '/^#.*mod_audio_fork/s/^#//' modules.conf.in 2>/dev/null || true; \
    # Add mod_audio_fork if it doesn't exist (add after mod_audio_socket or in audio section)
    if ! grep -q '^[^#]*mod_audio_fork' modules.conf.in; then \
    if grep -q 'mod_audio_socket' modules.conf.in; then \
    sed -i '/mod_audio_socket/a mod_audio_fork' modules.conf.in; \
    else \
    echo 'mod_audio_fork' >> modules.conf.in; \
    fi; \
    fi; \
    # Ensure mod_audio_socket is enabled
    sed -i '/^#.*mod_audio_socket/s/^#//' modules.conf.in 2>/dev/null || true; \
    fi

# Bootstrap and configure
RUN ./bootstrap.sh && \
    if [ -f modules.conf ]; then \
    sed -i '/signalwire/s/^/#/' modules.conf; \
    sed -i '/signalwire/s/^[^#]/#&/' modules.conf; \
    # Uncomment mod_audio_fork if it exists and is commented
    sed -i '/^#.*mod_audio_fork/s/^#//' modules.conf 2>/dev/null || true; \
    # Add mod_audio_fork if it doesn't exist
    if ! grep -q '^[^#]*mod_audio_fork' modules.conf; then \
    if grep -q 'mod_audio_socket' modules.conf; then \
    sed -i '/mod_audio_socket/a mod_audio_fork' modules.conf; \
    else \
    echo 'mod_audio_fork' >> modules.conf; \
    fi; \
    fi; \
    # Ensure mod_audio_socket is enabled
    sed -i '/^#.*mod_audio_socket/s/^#//' modules.conf 2>/dev/null || true; \
    fi && \
    ./configure --prefix=${FS_INSTALL_PREFIX} \
    --enable-core-odbc-support \
    --enable-zrtp \
    --enable-core-pgsql-support \
    --with-libvpx=/usr

# Build FreeSWITCH (this will take a while)
# Skip bundled libvpx build and link against system libvpx
RUN cd libs/libvpx && \
    echo "all:" > Makefile && \
    echo "install:" >> Makefile && \
    mkdir -p .libs && \
    # Create a wrapper library that links to system libvpx
    echo "void dummy() {}" > dummy.c && \
    gcc -c dummy.c -o dummy.o && \
    # Link dummy object with system libvpx to create a proper library
    gcc -shared -o .libs/libvpx.so dummy.o -lvpx -Wl,-rpath,/usr/lib/x86_64-linux-gnu && \
    ar rcs libvpx.a dummy.o && \
    ar rcs .libs/libvpx.a dummy.o && \
    rm -f dummy.c dummy.o && \
    cd ../..

# Modify Makefile to add libvpx to linker flags before building
# Replace the dummy libvpx.a reference with system libvpx, or add it
RUN sed -i 's|libs/libvpx/libvpx.a|-lvpx|g' Makefile && \
    # Also ensure libfreeswitch_la_LIBADD includes -lvpx
    sed -i '/^libfreeswitch_la_LIBADD =/s/$$/ -lvpx/' Makefile && \
    # Add to LIBS as well
    sed -i '/^LIBS =/s/$$/ -lvpx/' Makefile || true

# Build FreeSWITCH with fewer parallel jobs
RUN make -j2

# Install FreeSWITCH
RUN make install

# Build & install mod_audio_stream (streams audio to a WebSocket server)
# Requires freeswitch.pc available under ${FS_INSTALL_PREFIX}/lib/pkgconfig
ENV PKG_CONFIG_PATH=${FS_INSTALL_PREFIX}/lib/pkgconfig:/usr/local/lib/pkgconfig:/usr/lib/pkgconfig
WORKDIR /usr/src
RUN git clone https://github.com/amigniter/mod_audio_stream.git mod_audio_stream && \
    cd mod_audio_stream && \
    git submodule update --init --recursive && \
    mkdir -p build && cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    make -j2 && \
    make install && \
    ldconfig && \
    cd /usr/src && rm -rf mod_audio_stream

# Set permissions
RUN chown -R freeswitch:freeswitch ${FS_INSTALL_PREFIX}

# Create necessary directories
RUN mkdir -p ${FS_INSTALL_PREFIX}/log && \
    mkdir -p ${FS_INSTALL_PREFIX}/recordings && \
    mkdir -p ${FS_INSTALL_PREFIX}/storage && \
    chown -R freeswitch:freeswitch ${FS_INSTALL_PREFIX}

# Add FreeSWITCH bin to PATH in shell profile for interactive sessions
# freeswitch user home is /usr/local/freeswitch, add PATH to shell profiles
RUN echo 'export PATH=/usr/local/freeswitch/bin:$PATH' >> ${FS_INSTALL_PREFIX}/.bashrc && \
    echo 'export PATH=/usr/local/freeswitch/bin:$PATH' >> ${FS_INSTALL_PREFIX}/.profile && \
    chown freeswitch:freeswitch ${FS_INSTALL_PREFIX}/.bashrc ${FS_INSTALL_PREFIX}/.profile 2>/dev/null || true

# Expose FreeSWITCH ports
EXPOSE 5060/tcp 5060/udp 5080/tcp 5080/udp 8021/tcp 16384-32768/udp

# Switch to freeswitch user
USER freeswitch

# Set working directory
WORKDIR ${FS_INSTALL_PREFIX}

# Default command
CMD ["bin/freeswitch", "-nonat"]
