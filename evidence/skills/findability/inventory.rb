# Findability inventory (SAD v3.0.16 §NEW.26). Free; no model calls.
# Usage: ruby -E UTF-8 inventory.rb <entity folder> [vault root, default $VAULT_ROOT or the Documents folder] [--json out.json]
require 'yaml'; require 'date'; require 'json'
root = File.expand_path(ARGV[0] || abort("usage: inventory.rb <entity folder> [vault root] [--json out]"))
vault = File.expand_path(ARGV[1] && !ARGV[1].start_with?('--') ? ARGV[1] : ENV['VAULT_ROOT'] || File.join(Dir.home, 'Documents'))
jout = (i = ARGV.index('--json')) ? ARGV[i + 1] : nil
files = Dir.glob("#{root}/**/*.md").reject { |f| f.include?('/_archive/') || f.include?('/node_modules/') }
inbound = Hash.new(0)
Dir.glob("#{vault}/**/*.md").each do |f|
  next if f.include?('/node_modules/')
  t = (File.read(f, encoding: 'UTF-8') rescue ''); me = File.basename(f, '.md')
  t.scan(/\[\[([^\]|#]+)/) { |m| n = File.basename(m[0].strip); inbound[n] += 1 unless n == me }
end
gov = %w[planning planning-note architecture-spec spec research policy]
lock = /\b(locked|lock\b|decided|in force|ratified)\b/i
rows = files.map do |f|
  t = File.read(f, encoding: 'UTF-8'); fm = nil; err = false
  if t.start_with?('---')
    begin; fm = YAML.safe_load(t.split(/^---\s*$/, 3)[1], permitted_classes: [Date, Time]) || {}; rescue StandardError; err = true; fm = {}; end
  end
  fm = {} unless fm.is_a?(Hash) || fm.nil?
  rel = f.sub(root + '/', ''); body = t.split(/^---\s*$/, 3)[2] || t
  { path: rel, folder: File.dirname(rel), type: fm&.dig('type'), authority: fm&.dig('authority'), governed: !!fm&.dig('governed-by'),
    status: [fm&.dig('decision-status'), fm&.dig('status')].compact.join(' '), nofm: fm.nil?, yaml_error: err,
    inbound: inbound[File.basename(f, '.md')], lock_language: !!(body =~ lock), cites_decision: !!(body =~ /\bD-\d{3}\b|ADR-\d{4}/) }
end
g = rows.select { |r| gov.include?(r[:type].to_s) }
checks = {
  'no frontmatter' => rows.select { |r| r[:nofm] },
  'YAML errors' => rows.select { |r| r[:yaml_error] },
  'orphans (no inbound wikilink)' => rows.select { |r| r[:inbound].zero? },
  'governance docs missing governed-by' => g.reject { |r| r[:governed] },
  'governance docs missing authority' => g.reject { |r| r[:authority] },
  'authority gate (architectural+ in research/ or planning/)' => rows.select { |r| %w[constitutional strategic architectural].include?(r[:authority].to_s) && r[:folder] =~ %r{(^|/)(research|planning)(/|$)} },
  'wholly superseded but not archived' => rows.select { |r| r[:status] =~ /\b(superseded|withdrawn)\b/i && r[:status] !~ /in part|partly/i },
  'lock language without a D- or ADR number' => g.select { |r| r[:lock_language] && !r[:cites_decision] && r[:authority].to_s != 'exploratory' },
}
puts "Findability inventory: #{root} (#{rows.size} notes)"
checks.each { |k, v| puts format('  %-58s %d', k, v.size) }
checks.each { |k, v| next if v.empty? || k.start_with?('orphans'); puts "\n#{k}:"; v.first(15).each { |r| puts "  #{r[:path]}" } }
File.write(jout, JSON.pretty_generate(rows: rows, checks: checks.transform_values { |v| v.map { |r| r[:path] } })) if jout
