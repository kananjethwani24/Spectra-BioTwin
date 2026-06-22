setup:
	cargo build
	pip install -r python/requirements.txt

run-p1:
	cargo run --bin core-runner

run-p2:
	uv run python python/bio-synths/src/main.py

test:
	cargo test
	pytest python/bio-synths/tests
