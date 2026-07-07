FROM python:3.12-slim

ARG RNS_VERSION=0.9.4
ARG LXMF_VERSION=0.7.0
ARG UNPINNED=0

RUN if [ "$UNPINNED" = "1" ]; then \
      pip install --no-cache-dir rns lxmf; \
    else \
      pip install --no-cache-dir "rns==${RNS_VERSION}" "lxmf==${LXMF_VERSION}"; \
    fi

WORKDIR /conformance
COPY conformance/ /conformance/
CMD ["python", "-c", "import RNS; print('RNS reference image ready')"]
