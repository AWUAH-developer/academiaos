import styles from './RolesMarquee.module.css';

const roles = [
  'Super admin',
  'School administrator',
  'Proprietor',
  'Headteacher',
  'Academic administrator',
  'Class teacher',
  'Accounts officer',
  'Receptionist',
  'Transport officer',
  'Security / gate',
  'Librarian',
  'Canteen staff',
  'Parent / guardian',
  'Learner',
];

export function RolesMarquee() {
  return (
    <div className={styles.viewport}>
      <div className={styles.track}>
        {[0, 1].map((group) => (
          <div
            key={group}
            className={styles.group}
            aria-hidden={group === 1}
          >
            {roles.map((role) => (
              <span key={`${group}-${role}`} className={styles.pill}>
                {role}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
