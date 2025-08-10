#!/usr/bin/env python3
import sys, os, re, yaml

# usage: expected_from_formats.py <formats.yml> <username> <message>
# prints a regex that should match flattened chat text

def esc(s: str) -> str:
    return re.escape(s).replace(r'\ ', r'\s+')

def part_text(p):
    if p is None:
        return ""
    if isinstance(p, str):
        return p
    if isinstance(p, dict):
        return str(p.get('text', ''))
    return ""

def main():
    if len(sys.argv) < 4:
        print("usage: expected_from_formats.py <formats.yml> <username> <message>", file=sys.stderr)
        sys.exit(2)

    path, username, message = sys.argv[1], sys.argv[2], sys.argv[3]

    with open(path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)

    # Heuristic: use 'default' group or first mapping value
    group = None
    if isinstance(data, dict):
        group = data.get('default')
        if group is None and len(data):
            group = next(iter(data.values()))
    if not group:
        print("(?!)")  # never match
        return

    # Named parts first (everything except known keys)
    ordered_named = []
    for k, v in group.items():
        if k in ('player', 'divider', 'message', 'part-separator'):
            continue
        ordered_named.append(part_text(v))

    player = part_text(group.get('player', ''))
    divider = part_text(group.get('divider', ''))
    msg = part_text(group.get('message', ''))

    # Replace placeholders
    player = player.replace('{player}', username)
    msg = msg.replace('{message}', message)
    # If divider uses placeholders in your schema, handle here as needed

    # Join parts
    parts = [*ordered_named, player, divider, msg]
    line = "".join(parts)

    # Build forgiving regex (collapse spaces)
    regex = f"^{esc(line)}$"
    print(regex)

if __name__ == "__main__":
    main()
