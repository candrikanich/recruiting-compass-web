-- Migration: Seed Recruiting Timeline Tasks
-- Purpose: Load 80+ tasks for all grade levels (9-12) across 5 categories
-- Version: 1.0

-- Grade 9 (Freshman) Tasks - 18 tasks
INSERT INTO task (category, grade_level, title, description, required, why_it_matters, failure_risk, division_applicability) VALUES
-- Academic (4 tasks)
('academic', 9, 'Understand Academic Requirements', 'Research NCAA, NAIA, JUCO academic eligibility requirements and core course requirements', true, 'College coaches start evaluating academics early. Understanding requirements prevents wasting time on schools you cannot attend.', 'May miss schools where you are not academically eligible', ARRAY['ALL']),
('academic', 9, 'Take PSAT or Practice Tests', 'Take PSAT in fall or SAT/ACT practice test', false, 'Gets you familiar with test format and gives baseline score for target schools.', 'Late SAT/ACT preparation makes junior year stressful', ARRAY['ALL']),
('academic', 9, 'Meet with Academic Counselor', 'Discuss course selections and recruiting timeline with school counselor', false, 'Counselor can help select rigorous courses that impress colleges.', 'May miss challenging courses that boost your profile', ARRAY['ALL']),
('academic', 9, 'Track GPA and Grades', 'Establish system to monitor GPA and course performance', false, 'Coaches evaluate GPA trend. Freshman year GPA sets tone for recruiting.', 'Poor freshman grades hard to recover from', ARRAY['ALL']),

-- Athletic (4 tasks)
('athletic', 9, 'Establish Development Routine', 'Create strength, speed, and baseball-specific training program', true, 'Consistent training improves athletic development and demonstrates commitment.', 'Gap year freshman results in loss of development time', ARRAY['ALL']),
('athletic', 9, 'Play Travel Ball or Club Team', 'Join competitive team to develop skills against top competition', true, 'Travel ball exposure is critical for coach evaluation.', 'Local-only play limits college exposure', ARRAY['DI', 'DII', 'DIII', 'NAIA']),
('athletic', 9, 'Start Game Film Collection', 'Begin recording game footage systematically', false, 'Having film ready for sophomore video speeds up recruitment process later.', 'Scrambling for film as junior takes time from recruiting', ARRAY['ALL']),
('athletic', 9, 'Get Athletic Testing Baseline', 'Record baseline measurements (height, weight, 60-yard dash, exit velo if possible)', false, 'Establishes baseline to measure athletic development progress.', 'Cannot track improvement without baseline', ARRAY['ALL']),

-- Recruiting (3 tasks)
('recruiting', 9, 'Research Division Levels', 'Learn differences between DI, DII, DIII, NAIA, JUCO recruitment processes', true, 'Understanding division structure helps set realistic goals.', 'May target wrong division based on misunderstandings', ARRAY['ALL']),
('recruiting', 9, 'Start Building Target School List', 'Research and compile initial list of interested schools (start with 10-15)', false, 'Getting ahead on school research prevents last-minute scrambling.', 'Junior year rush to build list adds pressure', ARRAY['ALL']),
('recruiting', 9, 'Create Basic Athletic Resume', 'One-page resume with stats, achievements, and contact info', false, 'Having resume ready speeds up communication with coaches.', 'Unprepared materials appear unprofessional', ARRAY['ALL']),

-- Exposure (4 tasks)
('exposure', 9, 'Attend Summer Camps (Optional but Beneficial)', 'Attend at least one college baseball camp', false, 'Direct exposure to college coaches and competition.', 'Miss opportunity to be seen by coaches', ARRAY['DI', 'DII', 'DIII', 'NAIA']),
('exposure', 9, 'Research Showcases for Summer', 'Identify showcases and tournaments to participate in', false, 'Showcases get attention from multiple coaches at once.', 'Participating in wrong tournaments wastes time and money', ARRAY['ALL']),
('exposure', 9, 'Document Stats and Achievements', 'Keep detailed record of games, stats, and highlights', false, 'Having statistics ready for coaches looks professional.', 'Coaches skeptical of statistics without documentation', ARRAY['ALL']),
('exposure', 9, 'Create Social Media Presence', 'Set up or optimize Instagram/Twitter for athletic content', false, 'Coaches use social media to evaluate personality and maturity.', 'Unprofessional social media creates wrong impression', ARRAY['ALL']),

-- Mindset (3 tasks)
('mindset', 9, 'Understand Recruiting Reality', 'Learn realistic odds and timelines for different divisions', true, 'Unrealistic expectations lead to disappointment and poor decisions.', 'Unclear about actual recruiting odds and process', ARRAY['ALL']),
('mindset', 9, 'Set Recruiting Goals', 'Establish goals for freshman year (participation level, target division, etc.)', false, 'Clear goals focus efforts and create accountability.', 'Drifting without direction leads to missed opportunities', ARRAY['ALL']),
('mindset', 9, 'Establish Communication with Parents', 'Discuss recruiting expectations, timeline, and roles with family', false, 'Family alignment prevents miscommunications later.', 'Misaligned expectations cause family conflict during recruitment', ARRAY['ALL']),

-- Grade 10 (Sophomore) Tasks - 20 tasks
-- Academic (4 tasks)
('academic', 10, 'Maintain Strong GPA', 'Continue strong academic performance (target 3.0+)', true, 'GPA trend matters more than single year. Maintain momentum.', 'Downward GPA trend concerns coaches', ARRAY['ALL']),
('academic', 10, 'Take PSAT Again', 'Retake PSAT to track improvement', false, 'Demonstrates commitment to academics and provides updated benchmark.', 'Miss chance to show academic improvement', ARRAY['ALL']),
('academic', 10, 'Research College Academics', 'Research academic programs at target schools', false, 'Coaches evaluate fit based on academics too.', 'Unprepared for questions about academic fit', ARRAY['ALL']),
('academic', 10, 'Take SAT or ACT Prep Course', 'Enroll in official prep course or tutoring if needed', false, 'Structured prep improves scores significantly.', 'Unprepared test performance limits school options', ARRAY['ALL']),

-- Athletic (5 tasks)
('athletic', 10, 'Create Highlight Video', 'Compile 3-5 minute video of best plays and skills', true, 'Highlight video is primary tool coaches use for evaluation.', 'Coaches need video to properly evaluate talent', ARRAY['DI', 'DII', 'DIII', 'NAIA']),
('athletic', 10, 'Continue Development Training', 'Maintain consistent strength and speed training', true, 'Measurable athletic improvement sophomore year is critical.', 'Physical development plateaus without consistent training', ARRAY['ALL']),
('athletic', 10, 'Attend Premium Summer Tournaments', 'Play in high-profile showcases and tournaments', true, 'Visibility at quality tournaments is essential for exposure.', 'Low-profile tournaments limit coach visibility', ARRAY['DI', 'DII', 'DIII', 'NAIA']),
('athletic', 10, 'Get Updated Athletic Testing', 'Retest 60-yard dash, exit velo, and other metrics', false, 'Coaches want to see measurable improvement.', 'Coaches cannot assess physical development progress', ARRAY['ALL']),
('athletic', 10, 'Specialize Position Focus', 'Identify primary position and develop position-specific skills', false, 'Coaches evaluate position-specific tools.', 'Uncertain position status creates doubt with coaches', ARRAY['ALL']),

-- Recruiting (4 tasks)
('recruiting', 10, 'Build Target School List (20+ schools)', 'Expand list to 20+ schools across reach/match/safety categories', true, 'Diverse list increases chances of finding right fit.', 'Narrow list limits options if top choices do not recruit you', ARRAY['ALL']),
('recruiting', 10, 'Send First Introductory Emails', 'Contact coaches at target schools with intro email + video', true, 'First contact is critical - makes initial impression with coaches.', 'Coaches do not know you exist if you do not reach out', ARRAY['DI', 'DII', 'DIII', 'NAIA']),
('recruiting', 10, 'Research Coach Information', 'Identify and record coach names, contact info, and responsibilities', false, 'Personalized communication shows you did your homework.', 'Generic emails to wrong coaches get ignored or deleted', ARRAY['ALL']),
('recruiting', 10, 'Update Athletic Resume', 'Add sophomore stats and achievements to resume', false, 'Coaches want to see athletic progression.', 'Outdated resume looks unprofessional', ARRAY['ALL']),

-- Exposure (4 tasks)
('exposure', 10, 'Attend Summer Camps (Multiple)', 'Attend 1-2 college summer camps at target schools', true, 'Multiple camp exposures build relationships with coaching staff.', 'Limited camp attendance limits coach relationships', ARRAY['DI', 'DII', 'DIII', 'NAIA']),
('exposure', 10, 'Participate in Recruiting Events', 'Attend showcases, tournaments with college scouts present', true, 'Scouts at events actively evaluating talent.', 'Missing recruiting events means missing evaluation opportunities', ARRAY['ALL']),
('exposure', 10, 'Update Social Media with Highlight Content', 'Post game highlights and training content regularly', false, 'Regular content shows dedication and athletic development.', 'Inactive social media makes athlete appear unengaged', ARRAY['ALL']),
('exposure', 10, 'Film Responses to Coach Requests', 'Provide specific video clips when coaches request them', false, 'Responsiveness to coach requests shows professionalism.', 'Slow response or no response to requests hurts recruitment', ARRAY['ALL']),

-- Mindset (3 tasks)
('mindset', 10, 'Understand Recruiting Evaluation Process', 'Learn how coaches evaluate players (film, metrics, character)', false, 'Understanding evaluation criteria helps you present better.', 'Unaware of what coaches actually look for', ARRAY['ALL']),
('mindset', 10, 'Handle Recruiting Pressure', 'Develop mental strategy for managing pressure and expectations', false, 'Recruiting pressure can affect academics and performance if not managed.', 'Overwhelmed by pressure affects school performance', ARRAY['ALL']),
('mindset', 10, 'Stay Grounded and Humble', 'Maintain perspective that recruiting is not about ego', false, 'Arrogance turns off coaches; humility attracts them.', 'Poor attitude damages reputation with coaches', ARRAY['ALL']),

-- Grade 11 (Junior) Tasks - 23 tasks
-- Academic (4 tasks)
('academic', 11, 'Take Official SAT or ACT', 'Take official SAT or ACT test (target minimum for division)', true, 'Official test scores are required for college eligibility.', 'Missing test score deadline limits school options', ARRAY['ALL']),
('academic', 11, 'Maintain GPA (3.0+ target)', 'Keep grades strong; junior year academics heavily weighted', true, 'Junior year grades are most important to colleges.', 'Declining grades junior year is major red flag', ARRAY['ALL']),
('academic', 11, 'Meet with College Counselor', 'Discuss college fit and selection strategy with counselor', false, 'Counselor can advise on school selections.', 'Miss opportunity to discuss college options', ARRAY['ALL']),
('academic', 11, 'Take SAT or ACT Again (if needed)', 'Retake test if score below target', false, 'Multiple attempts improve chances of reaching score goal.', 'Stuck with below-target score if no second attempt', ARRAY['ALL']),

-- Athletic (6 tasks)
('athletic', 11, 'Register with NCAA Eligibility Center', 'Complete full registration with NCAA Eligibility Center', true, 'Registration is required for DI/II recruiting timeline. Cannot commit without it.', 'Missing registration deadline becomes deal-breaker', ARRAY['DI', 'DII']),
('athletic', 11, 'Register with NAIA Eligibility Center', 'Complete full registration with NAIA Eligibility Center if applicable', true, 'Registration required for NAIA schools.', 'Cannot be recruited by NAIA schools without registration', ARRAY['NAIA']),
('athletic', 11, 'Peak Athletic Performance', 'Junior year is peak performance - maximize showcase tournaments', true, 'Coaches make offers based on junior year performance.', 'Underperforming junior year means fewer offers', ARRAY['ALL']),
('athletic', 11, 'Get Updated Athletic Testing', 'Final testing: 60-yard dash, exit velo, infield velocity', false, 'Coaches want final athletic measurements for evaluation.', 'Coaches cannot accurately evaluate final athletic level', ARRAY['ALL']),
('athletic', 11, 'Film Multiple Game Performances', 'Ensure 6-10 games of film available showing consistency', true, 'Coaches need multiple games to assess consistency.', 'Limited film makes athlete look like one-game wonder', ARRAY['ALL']),
('athletic', 11, 'Pitch Your Strengths', 'Develop clear narrative around athletic strengths and position fit', false, 'Clear narrative helps coaches understand your profile.', 'Confused message about strengths confuses coaches', ARRAY['ALL']),

-- Recruiting (5 tasks)
('recruiting', 11, 'Increase Coach Communication Cadence', 'Contact coaches every 2-4 weeks with updates', true, 'Regular contact keeps you on coaches'' radar.', 'Silence after intro email leads to coaches forgetting you', ARRAY['ALL']),
('recruiting', 11, 'Send Junior Year Highlight Video Update', 'Update coaches with new junior year highlight reel (4-6 min)', true, 'New video shows current ability and consistent performance.', 'Coaches get bored with same old video', ARRAY['DI', 'DII', 'DIII', 'NAIA']),
('recruiting', 11, 'Schedule Unofficial Visits', 'Visit 3-5 target schools (unofficially, on your own)', true, 'Unofficial visits help assess fit and show interest.', 'Coaches doubt interest if athlete never visits', ARRAY['ALL']),
('recruiting', 11, 'Evaluate Interest Level from Coaches', 'Gauge which coaches are genuinely interested vs. polite', false, 'Accurate assessment prevents wasting time on long shots.', 'Miss real interest signals or chase dead ends', ARRAY['ALL']),
('recruiting', 11, 'Build Relationship with Preferred Coaches', 'Deepen connections with 2-3 coaches at top-choice schools', true, 'Personal relationships influence recruitment decisions.', 'Surface-level relationships do not lead to offers', ARRAY['ALL']),

-- Exposure (5 tasks)
('exposure', 11, 'Attend Recruiting Camps at Target Schools', 'Attend camps at your top 3-5 choices', true, 'Face-to-face time with coaches is critical for offers.', 'Coaches cannot make offers to athletes they do not know personally', ARRAY['DI', 'DII', 'DIII', 'NAIA']),
('exposure', 11, 'Play in National Showcases', 'Participate in major national showcases (if possible)', false, 'National showcases attract coaches from all divisions.', 'Missing national events limits exposure', ARRAY['DI', 'DII', 'DIII']),
('exposure', 11, 'Get Evaluated by Outside Scouts', 'Attend showcase with independent evaluators or Perfect Game', false, 'Third-party evaluation adds credibility to your profile.', 'Coaches may not trust self-reported evaluations', ARRAY['ALL']),
('exposure', 11, 'Document and Share Performance Data', 'Track and share metrics: exit velo, 60-time, infield velo', true, 'Objective data supports athletic evaluation.', 'Subjective claims without data appear exaggerated', ARRAY['ALL']),
('exposure', 11, 'Build Media Presence (Highlights Online)', 'Ensure highlight videos are easily accessible online', true, 'Coaches need quick access to evaluate you.', 'Hard to find videos means coaches move on to easier targets', ARRAY['ALL']),

-- Mindset (3 tasks)
('mindset', 11, 'Develop Resilience for Rejection', 'Prepare mentally for potential rejections or no interest', false, 'Rejection is normal in recruiting; resilience is key.', 'Devastated by rejections, may give up or make poor decisions', ARRAY['ALL']),
('mindset', 11, 'Evaluate School Fit Beyond Baseball', 'Consider academics, location, cost, campus culture, not just baseball', true, 'You will spend more time as a student than athlete.', 'Focusing only on baseball leads to poor school choice', ARRAY['ALL']),
('mindset', 11, 'Prepare for Offer Conversations', 'Understand what questions coaches will ask; practice answers', false, 'Preparation prevents saying wrong things in offer calls.', 'Unprepared athlete may say something that costs offer', ARRAY['ALL']),

-- Grade 12 (Senior) Tasks - 19 tasks
-- Academic (3 tasks)
('academic', 12, 'Maintain Strong Grades (College-Ready)', 'Keep GPA strong through senior year (no senioritis)', true, 'Colleges rescind offers for grade drops.', 'Poor senior grades can result in offer rescission', ARRAY['ALL']),
('academic', 12, 'Finalize Test Scores', 'Ensure all test scores officially sent to schools', false, 'Coaches need official scores for enrollment.', 'Missing official scores causes enrollment delays', ARRAY['ALL']),
('academic', 12, 'Complete College Applications', 'Submit applications to target schools by deadlines', true, 'Applications required for enrollment.', 'Late applications may result in rejection', ARRAY['ALL']),

-- Athletic (4 tasks)
('athletic', 12, 'Peak Senior Year Performance', 'Maximize performance in final HS season; coaches are watching', true, 'Senior year performance influences final offer terms.', 'Poor senior performance can result in lower offer', ARRAY['ALL']),
('athletic', 12, 'Attend Final Recruiting Camps/Showcases', 'Attend last camps to finalize recruiting with interested programs', false, 'Final in-person meetings often seal deals.', 'Final camps crucial for athletes still uncommitted', ARRAY['ALL']),
('athletic', 12, 'Submit Final Highlight Video', 'Provide full senior year highlight reel if not yet committed', false, 'Final video shows complete HS career.', 'Coaches base final evaluations on senior film', ARRAY['ALL']),
('athletic', 12, 'Finalize Medical Information', 'Ensure all medical records and clearance forms ready', false, 'Coaches need medical clearance before official visit.', 'Missing medical info delays official visits', ARRAY['ALL']),

-- Recruiting (5 tasks)
('recruiting', 12, 'Attend Official Visits', 'Visit 2-3 finalist schools for official recruiting visit', true, 'Official visits are turning point in recruitment.', 'Coaches make final decisions based on official visit impressions', ARRAY['DI', 'DII', 'DIII', 'NAIA']),
('recruiting', 12, 'Manage Multiple Offers (if applicable)', 'Track and evaluate all outstanding offers', false, 'Keep organized records of all offer details.', 'Forgetting offer details leads to poor decision', ARRAY['ALL']),
('recruiting', 12, 'Make Final School Decision', 'Commit to school before NLI signing date', true, 'Commitment locks in your path forward.', 'Uncommitted past deadline creates uncertainty', ARRAY['ALL']),
('recruiting', 12, 'Sign NLI (if offered)', 'Sign National Letter of Intent during signing period', true, 'NLI formalizes your commitment to school.', 'Failing to sign NLI allows coach to recruit over you', ARRAY['DI', 'DII']),
('recruiting', 12, 'Communicate Decision to Other Coaches', 'Notify coaches you have committed to another school', false, 'Respectful communication maintains relationships.', 'Poor communication leaves negative impression', ARRAY['ALL']),

-- Exposure (2 tasks)
('exposure', 12, 'Finalize Player Video for College', 'Provide complete freshman-to-senior career highlight video', false, 'College coaches want to see full HS career progression.', 'College coaches base evaluation on incomplete information', ARRAY['ALL']),
('exposure', 12, 'Maintain Professional Social Media Through Commitment', 'Keep social media professional post-commitment', false, 'College coaches monitor social media of commits.', 'Unprofessional posts can jeopardize scholarship', ARRAY['ALL']),

-- Mindset (2 tasks)
('mindset', 12, 'Prepare for College Transition', 'Mentally and physically prepare for college-level baseball', false, 'College game is significantly faster and more competitive.', 'Unprepared for college speed affects freshman performance', ARRAY['ALL']),
('mindset', 12, 'Celebrate the Journey', 'Recognize accomplishment of getting recruited to play college ball', false, 'Takes perspective and resilience to reach this point.', 'Burnout if you do not acknowledge accomplishment', ARRAY['ALL']);

-- Verify inserted count
SELECT COUNT(*) as total_tasks FROM task;
